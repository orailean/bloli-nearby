import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
const results = {};
const browser = await chromium.launch();
try {
  for (const id of (process.env.SITES || "loo,kippe,kebab").split(",")) {
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
      /travelmode=walking/,
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
    await page.locator(".open-now-control input").check();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    assert.deepEqual(errors, []);
    results[id] = {
      profile: profile.id,
      count: status.body.count,
      datasetAt: status.body.datasetAt,
      importedAt: status.body.importedAt,
      munichResults: all.items.length,
      initialHtml: true,
      mapImagesLoaded: true,
      mobileLocales: true,
      openNowControl: true,
      pageErrors: errors,
    };
    await context.close();
  }
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
