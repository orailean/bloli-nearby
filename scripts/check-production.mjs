import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
const base = process.env.LIVE_URL || "https://loo.bloli.com";
const status = await fetch(`${base}/api/status`).then((r) => r.json());
assert.equal(status.ready, true, "Germany dataset must be ready");
const locations = {
  Munich: [48.137, 11.576],
  Berlin: [52.52, 13.405],
  Hamburg: [53.5511, 9.9937],
};
const checks = { dataset: status, cities: {} };
for (const [city, [lat, lon]] of Object.entries(locations)) {
  const response = await fetch(
    `${base}/api/toilets?${new URLSearchParams({ lat, lon, radius: 5000, limit: 100 })}`,
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(body.items.length > 0, `${city} must have results`);
  checks.cities[city] = {
    results: body.items.length,
    truncated: body.truncated,
  };
}
const postcodes = await fetch(`${base}/api/settlements?q=81243`).then((r) =>
  r.json(),
);
assert.ok(postcodes.items.some((p) => p.postcode === "81243"));
const browser = await chromium.launch();
try {
  const context = await browser.newContext({
    locale: "fr-FR",
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await expect
    .poll(
      () =>
        page
          .locator(".leaflet-tile")
          .evaluateAll(
            (images) =>
              images.filter((img) => img.complete && img.naturalWidth > 0)
                .length,
          ),
      { timeout: 15000 },
    )
    .toBeGreaterThan(0);
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await page.getByLabel("Sprache", { exact: true }).selectOption("en");
  await page.getByLabel("Town or postcode", { exact: true }).fill("81243");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.locator(".place-option").first()).toBeVisible();
  await page.locator(".place-option").first().click();
  await expect(page.locator(".result-select").first()).toBeVisible();
  await page.locator(".result-select").first().click();
  await expect(
    page.getByRole("link", { name: "Walk there", exact: true }),
  ).toHaveAttribute("href", /travelmode=walking/);
  const tileZoom = () =>
    page
      .locator(".leaflet-tile")
      .first()
      .getAttribute("src")
      .then((src) => Number(src?.match(/openstreetmap\.org\/(\d+)\//)?.[1]));
  const narrowZoom = await tileZoom();
  const changeRadius = async (radius) => {
    const [response] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes("/api/toilets?") &&
          new URL(r.url()).searchParams.get("radius") === radius,
      ),
      page.locator(".radius-control select").selectOption(radius),
    ]);
    assert.equal(response.status(), 200);
    const data = await response.json();
    assert.ok(data.items.every((item) => item.distance <= Number(radius)));
    return data;
  };
  await changeRadius("10000");
  await expect.poll(tileZoom).toBeLessThan(narrowZoom);
  await expect(page.locator(".search-boundary")).toHaveCount(1);
  const [openResponse] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes("/api/toilets?") &&
        new URL(r.url()).searchParams.get("openNow") === "true",
    ),
    page.getByRole("checkbox", { name: "Open now", exact: true }).check(),
  ]);
  assert.equal(openResponse.status(), 200);
  const openItems = (await openResponse.json()).items;
  assert.ok(openItems.length > 0);
  assert.ok(openItems.every((item) => item.openingHours));
  await page.setViewportSize({ width: 390, height: 844 });
  const wideZoom = await tileZoom();
  await changeRadius("2000");
  await expect.poll(tileZoom).toBeGreaterThan(wideZoom);
  await page.getByLabel("Language", { exact: true }).selectOption("ro");
  await expect(page.locator("html")).toHaveAttribute("lang", "ro");
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await expect(page.locator(".leaflet-control-attribution")).toContainText(
    "OpenStreetMap",
  );
  assert.equal(
    await page
      .locator(".results-content")
      .evaluate((el) => getComputedStyle(el).overflowY),
    "visible",
  );
  await page.locator("#language").selectOption("de");
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    return document.fonts.ready;
  });
  assert.equal(
    await page.locator("#hero-title").evaluate((heading) => {
      const text = heading.firstChild;
      const range = document.createRange();
      for (let i = 0; i < text.textContent.length; i++) {
        if (!text.textContent[i].trim()) continue;
        range.setStart(text, i);
        range.setEnd(text, i + 1);
        const r = range.getBoundingClientRect();
        if (
          !heading.contains(
            document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
          )
        )
          return false;
      }
      return true;
    }),
    true,
  );
  assert.deepEqual(errors, []);
  checks.browser = {
    mapImagesLoaded: true,
    radiusDesktopAndMobile: true,
    openNow: true,
    germanFallback: true,
    postcodeSearch: true,
    romanianSwitch: true,
    mobileWidth: true,
    mobileNaturalScrolling: true,
    germanPhoneHeadlineClear: true,
    pageErrors: errors,
  };
  console.log(JSON.stringify(checks, null, 2));
} finally {
  await browser.close();
}
