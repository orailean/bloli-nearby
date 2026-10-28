import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
const results = {};
const expectedCountries = (process.env.EXPECTED_COUNTRIES || "de,ro")
  .split(",").map((value) => value.trim()).filter(Boolean);
const countryLabels = {
  de: { de: "Deutschland", en: "Germany", ro: "Germania" },
  ro: { de: "Rumänien", en: "Romania", ro: "România" },
  at: { de: "Österreich", en: "Austria", ro: "Austria" },
  hu: { de: "Ungarn", en: "Hungary", ro: "Ungaria" },
};
const browser = await chromium.launch();
try {
  for (const id of (
    process.env.SITES || "loo,kippe,kebab,water,transit,charge"
  ).split(",")) {
    const base = `https://${id}.bloli.com`;
    const htmlResponse = await fetch(base);
    assert.equal(htmlResponse.status, 200);
    const html = await htmlResponse.text();
    assert.ok(html.includes(`data-site="${id}"`));
    assert.ok(html.includes(`https://${id}.bloli.com/`));
    const profile = await fetch(`${base}/api/site`).then((r) => r.json());
    assert.equal(profile.id, id);
    const status = await fetch(`${base}/api/ready`).then(async (r) => ({
      status: r.status,
      body: await r.json(),
    }));
    assert.equal(status.status, 200);
    assert.equal(status.body.ready, true);
    const countryStates = new Map((status.body.countries || []).map((country) => [country.code, country]));
    for (const code of expectedCountries) {
      const country = countryStates.get(code);
      assert.ok(country, `${id}: status must include ${code}`);
      assert.equal(country.status, "active", `${id}: ${code} should be active`);
      assert.equal(country.ready, true, `${id}: ${code} snapshot should be ready`);
      assert.ok(country.datasetAt, `${id}: ${code} source date should be present`);
    }
    for (const code of ["ro", "at", "hu"].filter((code) => !expectedCountries.includes(code))) {
      const country = countryStates.get(code);
      if (country) assert.equal(country.status, "pending", `${id}: ${code} must remain pending`);
    }
    const query = "lat=48.1391&lon=11.4729&radius=5000";
    const all = await fetch(`${base}/api/locations?${query}`).then((r) =>
      r.json(),
    );
    assert.ok(all.items.length > 0);
    assert.ok(
      all.items.every(
        (item) =>
          item.distance <= 5000 &&
          (id === "kippe" ? !!item.sellerType : !item.sellerType),
      ),
    );
    const countrySearches = {
      ro: { name: "Bucharest", lat: 44.4268, lon: 26.1025 },
      at: { name: "Vienna", lat: 48.2082, lon: 16.3738 },
      hu: { name: "Budapest", lat: 47.4979, lon: 19.0402 },
    };
    for (const code of expectedCountries.filter((country) => country !== "de")) {
      const city = countrySearches[code];
      assert.ok(city, `${code}: a city probe is configured`);
      const results = await fetch(`${base}/api/locations?lat=${city.lat}&lon=${city.lon}&radius=5000`).then((r) => r.json());
      assert.ok(results.items.length > 0, `${id}: ${city.name} results`);
      assert.ok(results.items.every((item) => item.countryCode === code), `${id}: ${city.name} results must identify ${code}`);
      if (code === "ro") {
      const settlements = await fetch(`${base}/api/settlements?q=bucuresti&country=ro`).then((r) => r.json());
      assert.ok(settlements.items.some((item) => item.countryCode === "ro"), `${id}: unaccented Romanian settlement match`);
      }
    }
    if (id === "kebab") {
      assert.ok(
        all.items.every(
          (item) => item.category === "kebab" && !item.hoursAssumed,
        ),
      );
      for (const suffix of ["&fee=all", "&sellerType=all", "&category=tobacco"])
        assert.equal(
          (await fetch(`${base}/api/locations?${query}${suffix}`)).status,
          400,
        );
      const opened = await fetch(
        `${base}/api/locations?${query}&openNow=true`,
      ).then((r) => r.json());
      assert.ok(
        opened.items.every((item) => !!item.openingHours && !item.hoursAssumed),
      );
    }
    if (id === "transit") {
      assert.ok(
        all.items.every(
          (item) => item.category === "transit" && item.transit?.modes?.length,
        ),
      );
      for (const suffix of ["&fee=all", "&sellerType=all", "&openNow=false"])
        assert.equal(
          (await fetch(`${base}/api/locations?${query}${suffix}`)).status,
          400,
        );
      for (const mode of [
        "train",
        "suburban_rail",
        "subway",
        "tram",
        "bus",
        "taxi",
      ]) {
        const r = await fetch(`${base}/api/locations?${query}&mode=${mode}`);
        assert.equal(r.status, 200);
        const d = await r.json();
        assert.ok(d.items.every((item) => item.transit.modes.includes(mode)));
      }
    }
    if (id === "charge") {
      assert.ok(all.items.every((item) => item.category === "charge"));
      for (const suffix of ["&mode=all", "&sellerType=all"])
        assert.equal(
          (await fetch(`${base}/api/locations?${query}${suffix}`)).status,
          400,
        );
      for (const [connector, minPowerKw] of [
        ["ccs", 150],
        ["type2", 22],
        ["chademo", 0],
      ]) {
        const response = await fetch(
          `${base}/api/locations?${query}&connector=${connector}&minPowerKw=${minPowerKw}`,
        );
        assert.equal(response.status, 200);
        const data = await response.json();
        assert.ok(
          data.items.every((item) =>
            item.charging?.connectors?.some(
              (socket) =>
                socket.type === connector &&
                (minPowerKw === 0 || (socket.outputKw ?? -1) >= minPowerKw),
            ),
          ),
        );
      }
      for (const access of ["public", "customers"]) {
        const response = await fetch(
          `${base}/api/locations?${query}&chargeAccess=${access}`,
        );
        assert.equal(response.status, 200);
        const data = await response.json();
        assert.ok(data.items.every((item) => item.access === access));
      }
    }
    if (id === "water") {
      assert.ok(
        all.items.every(
          (item) => item.category === "water" && !item.hoursAssumed,
        ),
      );
      for (const suffix of ["&sellerType=all", "&category=tobacco"])
        assert.equal(
          (await fetch(`${base}/api/locations?${query}${suffix}`)).status,
          400,
        );
      for (const fee of ["free", "paid"]) {
        const r = await fetch(`${base}/api/locations?${query}&fee=${fee}`);
        assert.equal(r.status, 200);
        const d = await r.json();
        assert.ok(d.items.every((item) => item.fee === fee));
      }
    }
    if (id === "kippe") {
      for (const type of ["machine", "shop", "fuel"]) {
        const response = await fetch(
          `${base}/api/locations?${query}&sellerType=${type}`,
        );
        assert.equal(response.status, 200);
        const data = await response.json();
        assert.ok(data.items.length > 0, `${type} results near Munich`);
        assert.ok(data.items.every((item) => item.sellerType === type));
      }
      assert.equal(
        (await fetch(`${base}/api/locations?${query}&fee=free`)).status,
        400,
      );
      assert.equal(
        (await fetch(`${base}/api/locations?${query}&category=toilets`)).status,
        400,
      );
    }
    const context = await browser.newContext({
      locale: "en-GB",
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await expect(page.locator("html")).toHaveAttribute("data-site", id);
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
    await expect(page.locator(".radius-control select")).toHaveValue("500");
    await page.getByRole("button", { name: "München", exact: true }).click();
    await page.locator(".radius-control select").selectOption("5000");
    await expect(page.locator(".result-select").first()).toBeVisible();
    await page.locator(".result-select").first().click();
    await expect(page.locator(".detail-panel .walk-button")).toHaveAttribute(
      "href",
      id === "charge" ? /travelmode=driving/ : /travelmode=walking/,
    );
    await expect(page.locator(".search-boundary")).toHaveCount(1);
    if (id === "kippe")
      await expect(page.locator(".seller-filters")).toBeVisible();
    if (id === "kippe") {
      await page
        .getByRole("button", { name: "Petrol station", exact: true })
        .click();
      await expect(page.locator(".result-select").first()).toBeVisible();
      await expect(page.locator(".results-content")).not.toContainText(
        "unconfirmed",
      );
      await page.locator(".result-select").first().click();
      await expect(page.locator(".detail-panel")).not.toContainText(
        "Tobacco sales",
      );
    }
    for (const width of [320, 390, 430]) {
      await page.setViewportSize({ width, height: 852 });
      for (const lang of ["de", "ro", "en"]) {
        await page.locator("#language").selectOption(lang);
        await page.evaluate(() => document.fonts.ready);
        if (expectedCountries.length > 1) {
          const coverage = expectedCountries.map((code) => countryLabels[code][lang]);
          for (const name of coverage) {
            await expect(page.locator(".hero-copy > p")).toContainText(name);
          }
          await expect
            .poll(() =>
              page.locator('meta[name="description"]').getAttribute("content"),
            )
            .toContain(coverage[coverage.length - 1]);
        }
        assert.equal(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth <= innerWidth &&
              document.body.scrollWidth <= innerWidth,
          ),
          true,
          `${id} ${width} ${lang}`,
        );
      }
    }
    assert.equal(
      await page
        .locator(".results-content")
        .evaluate((el) => getComputedStyle(el).overflowY),
      "visible",
    );
    if (id === "transit") {
      await expect(page.locator(".open-now-control")).toHaveCount(0);
      await expect(page.locator(".transit-mode-control")).toBeVisible();
    } else {
      if (id === "charge")
        await expect(page.locator(".charge-select")).toHaveCount(3);
      await page.locator(".open-now-control input").check();
    }
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    assert.deepEqual(errors, []);
    results[id] = {
      profile: profile.id,
      count: status.body.count,
      datasetAt: status.body.datasetAt,
      importedAt: status.body.importedAt,
      countries: [...countryStates].map(([code, country]) => ({ code, status: country.status, ready: country.ready, datasetAt: country.datasetAt })),
      munichResults: all.items.length,
      initialHtml: true,
      mapImagesLoaded: true,
      mobileLocales: true,
      openNowControl: id !== "transit",
      modeControl: id === "transit",
      pageErrors: errors,
    };
    await context.close();
  }
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
