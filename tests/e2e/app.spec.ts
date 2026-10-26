import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", (r) => r.abort());
});
test("search, filters, details, language switching and directions work without tiles", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Nature calls.",
  );
  await page.getByRole("button", { name: "Bremen", exact: true }).click();
  await expect(page.locator(".result-select").first()).toBeVisible();
  await expect(page.locator(".leaflet-control-attribution")).toContainText(
    "OpenStreetMap",
  );
  await page.locator(".result-select").first().click();
  const selected = await page
    .locator(".result-row.selected")
    .getAttribute("data-id");
  await expect(
    page.getByRole("link", { name: "Walk there", exact: true }),
  ).toHaveAttribute("href", /travelmode=walking/);
  await page.getByLabel("Language", { exact: true }).selectOption("ro");
  await expect(page.locator("html")).toHaveAttribute("lang", "ro");
  await expect(page.locator(".result-row.selected")).toHaveAttribute(
    "data-id",
    selected!,
  );
  await page.getByRole("button", { name: "Gratuite", exact: true }).click();
  await expect(page.locator(".result-row").first()).toBeVisible();
  await expect(page.locator(".result-row .fee-badge").first()).toHaveText(
    "Gratuită",
  );
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "ro");
  await page.getByLabel("Limbă", { exact: true }).selectOption("de");
  await expect(
    page.getByPlaceholder("Zum Beispiel München oder 81243…"),
  ).toBeVisible();
  await expect(page.locator("footer")).toContainText("Weniger suchen.");
});
test("mobile has a real header/footer, usable controls and no horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("header")).toBeVisible();
  await page.getByRole("button", { name: "Bremen", exact: true }).click();
  await expect(page.locator(".result-select").first()).toBeVisible();
  await page.locator(".result-select").first().click();
  await expect(
    page.getByRole("link", { name: "Walk there", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Privacy & map credits", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("denied location and unavailable storage leave manual lookup usable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: (_ok: unknown, fail: (error: object) => void) =>
          fail({ code: 1 }),
      },
    });
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Find me a loo", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Location unavailable");
  await page.getByLabel("Language", { exact: true }).selectOption("ro");
  await expect(page.locator("html")).toHaveAttribute("lang", "ro");
  await page
    .getByLabel("Localitate sau cod poștal", { exact: true })
    .fill("Bremen");
  await page.getByRole("button", { name: "Caută", exact: true }).click();
  await expect(page.locator(".place-option").first()).toBeVisible();
  await page.locator(".place-option").first().click();
  await expect(page.locator(".result-select").first()).toBeVisible();
});
test("a missing bootstrap dataset shows an actionable state rather than no toilets", async ({
  page,
}) => {
  await page.route("**/api/status", (r) =>
    r.fulfill({
      json: {
        ready: false,
        count: 0,
        datasetAt: null,
        importedAt: null,
        source: null,
        stale: false,
        latestJob: null,
      },
    }),
  );
  await page.goto("/");
  await expect(
    page.getByText("The toilet dataset is not ready yet.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText("No pit stops here yet.", { exact: true }),
  ).not.toBeVisible();
});

test("late geolocation cannot replace a newer manual location", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      value: {
        getCurrentPosition: (success: unknown) => {
          (window as unknown as { resolveGeo: unknown }).resolveGeo = success;
        },
      },
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Find me a loo", exact: true })
    .click();
  await page.getByRole("button", { name: "Bremen", exact: true }).click();
  await expect(page.locator(".results-heading p")).toHaveText("Bremen");
  await page.evaluate(() => {
    (window as unknown as { resolveGeo: (p: unknown) => void }).resolveGeo({
      coords: { latitude: 48.137, longitude: 11.576 },
    });
  });
  await expect(page.locator(".results-heading p")).toHaveText("Bremen");
});
test("map position and marker keyboard focus survive selection and translation", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Bremen", exact: true }).click();
  const marker = page.locator('.leaflet-marker-icon[tabindex="0"]').first();
  await marker.waitFor();
  await marker.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.locator('.leaflet-marker-icon[aria-label^="Selected toilet:"]'),
  ).toBeFocused();
  await page.locator(".leaflet-map").focus();
  for (let i = 0; i < 12; i++) await page.keyboard.press("ArrowRight");
  const transform = await page
    .locator(".leaflet-map-pane")
    .evaluate((e) => (e as HTMLElement).style.transform);
  await page.getByLabel("Language", { exact: true }).selectOption("ro");
  await expect(
    page.locator('.leaflet-marker-icon[aria-label^="Toaleta selectată:"]'),
  ).toBeVisible();
  expect(
    await page
      .locator(".leaflet-map-pane")
      .evaluate((e) => (e as HTMLElement).style.transform),
  ).toBe(transform);
});

test("browser language detection does not create an explicit saved preference", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("loo.language")),
  ).toBeNull();
  await page.getByLabel("Language", { exact: true }).selectOption("ro");
  expect(await page.evaluate(() => localStorage.getItem("loo.language"))).toBe(
    "ro",
  );
});

test("selecting a map marker scrolls its result into the results pane", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Bremen", exact: true }).click();
  const markers = page.locator('.leaflet-marker-icon[tabindex="0"]');
  await expect(markers.first()).toBeVisible();
  const marker = markers.last();
  const id = await marker.getAttribute("data-facility-id");
  await marker.focus();
  await marker.press("Enter");
  const selected = page.locator(`.result-row[data-id="${id}"]`);
  await expect(selected).toHaveClass(/selected/);
  await expect
    .poll(() =>
      selected.evaluate((row) => {
        const pane = document.querySelector(".results-content")!;
        const r = row.getBoundingClientRect(),
          p = pane.getBoundingClientRect();
        return r.top >= p.top - 1 && r.top < p.bottom - 50;
      }),
    )
    .toBe(true);
});

test("changing search radius fits the map to the new search area", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Bremen", exact: true }).click();
  await expect(page.locator(".result-select").first()).toBeVisible();
  const zoom = () =>
    page
      .locator(".leaflet-tile")
      .first()
      .getAttribute("src")
      .then((src) => Number(src?.match(/openstreetmap\.org\/(\d+)\//)?.[1]));
  await expect(page.locator(".radius-control select")).toHaveValue("500");
  expect(
    await page
      .locator(".radius-control option")
      .evaluateAll((options) =>
        options.map((option) => (option as HTMLOptionElement).value),
      ),
  ).toEqual(["500", "1000", "2000", "3000", "5000"]);
  const initialZoom = await zoom();
  await page.locator(".radius-control select").selectOption("5000");
  await expect.poll(zoom).toBeLessThan(initialZoom);
  const wideZoom = await zoom();
  await page.locator(".radius-control select").selectOption("500");
  await expect.poll(zoom).toBeGreaterThan(wideZoom);
});

for (const width of [1440, 390]) {
  test(`radius and Open now update both list and map at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const dataset = {
      ready: true,
      count: 2,
      datasetAt: "2026-10-25T00:00:00Z",
      importedAt: "2026-10-26T00:00:00Z",
      source: "fixture",
      stale: false,
      latestJob: null,
    };
    const facility = (
      id: string,
      lon: number,
      hours: string,
      distance: number,
    ) => ({
      id,
      sourceType: "node",
      sourceId: id,
      lat: 53.0758,
      lon,
      name: id,
      names: {},
      fee: "free",
      charge: null,
      feeText: null,
      access: "public",
      wheelchair: "unknown",
      openingHours: hours,
      operator: null,
      notes: null,
      tags: {},
      distance,
    });
    await page.route("**/api/status", (r) => r.fulfill({ json: dataset }));
    await page.route("**/api/locations?*", (r) => {
      const q = new URL(r.request().url()).searchParams;
      const items = [
        facility("Near closed", 8.81, "off", 500),
        facility("Far open", 8.85, "24/7", 4000),
      ].filter(
        (f) =>
          f.distance <= Number(q.get("radius")) &&
          (q.get("openNow") !== "true" || f.openingHours === "24/7"),
      );
      return r.fulfill({ json: { items, truncated: false, dataset } });
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Bremen", exact: true }).click();
    await expect(page.locator(".result-row")).toHaveCount(1);
    const zoom = () =>
      page
        .locator(".leaflet-tile")
        .first()
        .getAttribute("src")
        .then((src) => Number(src?.match(/openstreetmap\.org\/(\d+)\//)?.[1]));
    const narrow = await zoom();
    await page.locator(".radius-control select").selectOption("5000");
    await expect(page.locator(".result-row")).toHaveCount(2);
    await expect.poll(zoom).toBeLessThan(narrow);
    await expect(page.locator(".search-boundary")).toHaveCount(1);
    await page.getByRole("checkbox", { name: "Open now", exact: true }).check();
    await expect(page.locator(".result-row")).toHaveCount(1);
    await expect(page.locator(".result-row")).toContainText("Far open");
    await page.locator(".radius-control select").selectOption("500");
    await expect(page.locator(".result-row")).toHaveCount(0);
    await expect.poll(zoom).toBe(narrow);
    await page
      .getByRole("checkbox", { name: "Open now", exact: true })
      .uncheck();
    await expect(page.locator(".result-row")).toHaveCount(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("phone hero letters are not covered by the mascot in any language", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 800 });
    for (const locale of ["de", "en", "ro"]) {
      await page.locator("#language").selectOption(locale);
      await page.evaluate(() => document.fonts.ready);
      const hidden = await page.locator("#hero-title").evaluate((heading) => {
        const text = heading.firstChild!;
        const range = document.createRange();
        const covered = [];
        for (let i = 0; i < (text.textContent?.length || 0); i++) {
          if (!text.textContent![i].trim()) continue;
          range.setStart(text, i);
          range.setEnd(text, i + 1);
          const r = range.getBoundingClientRect();
          const top = document.elementFromPoint(
            r.x + r.width / 2,
            r.y + r.height / 2,
          );
          if (!top || !heading.contains(top))
            covered.push(text.textContent![i]);
        }
        return covered;
      });
      expect(hidden, `${locale} ${width}px`).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  }
});

test("all ten phone results are reachable through normal page scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const dataset = {
    ready: true,
    count: 10,
    datasetAt: "2026-10-25T00:00:00Z",
    importedAt: "2026-10-26T00:00:00Z",
    source: "fixture",
    stale: false,
    latestJob: null,
  };
  await page.route("**/api/status", (r) => r.fulfill({ json: dataset }));
  await page.route("**/api/locations?*", (r) =>
    r.fulfill({
      json: {
        dataset,
        truncated: false,
        items: Array.from({ length: 10 }, (_, i) => ({
          id: `node/${i}`,
          sourceType: "node",
          sourceId: String(i),
          name: `Toilet ${i + 1}`,
          names: {},
          lat: 53.0758,
          lon: 8.8072 + i * 0.001,
          fee: "free",
          charge: null,
          feeText: null,
          access: "public",
          wheelchair: "unknown",
          openingHours: null,
          operator: null,
          notes: null,
          tags: {},
          distance: i * 80,
        })),
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Bremen", exact: true }).click();
  await expect(page.locator(".results-count")).toHaveText("10");
  await expect(page.locator(".result-row")).toHaveCount(10);
  expect(
    await page
      .locator(".results-content")
      .evaluate((el) => el.clientHeight >= el.scrollHeight),
  ).toBe(true);
  const last = page.locator(".result-select").last();
  await last.scrollIntoViewIfNeeded();
  await last.click();
  await expect(page.locator(".result-row.selected")).toHaveAttribute(
    "data-id",
    "node/9",
  );
});

test("phone mascot has a genuinely small layout box", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/");
  await page.locator("#language").selectOption("de");
  expect(
    await page
      .locator(".hero-art")
      .evaluate((el) => (el as HTMLElement).offsetWidth),
  ).toBeLessThanOrEqual(110);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= innerWidth &&
        document.body.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
