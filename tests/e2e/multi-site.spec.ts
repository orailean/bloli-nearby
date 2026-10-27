import { test, expect } from "@playwright/test";
import { sites } from "../../src/shared/sites.js";
const dataset = {
  ready: true,
  count: 3,
  datasetAt: "2026-10-25T00:00:00Z",
  importedAt: "2026-10-26T00:00:00Z",
  source: "fixture",
  stale: false,
  latestJob: null,
};
for (const id of ["loo", "kippe", "kebab", "water"] as const) {
  for (const width of [1440, 320, 390, 430]) {
    test(`${id} ${width}px shares search, keeps its category and fits every locale`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.route("https://tile.openstreetmap.org/**", (route) =>
        route.abort(),
      );
      await page.route("**/api/config", (route) =>
        route.fulfill({
          json: {
            site: sites[id],
            tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            tileMaxZoom: 19,
            tileAttribution: "© OpenStreetMap contributors",
            contactEmail: null,
          },
        }),
      );
      await page.route("**/api/status", (route) =>
        route.fulfill({ json: dataset }),
      );
      await page.route("**/api/locations?*", (route) => {
        const q = new URL(route.request().url()).searchParams;
        expect(q.get("radius")).toMatch(/^(500|1000|2000|3000|5000)$/);
        expect(
          q.has(["loo", "water"].includes(id) ? "sellerType" : "fee"),
        ).toBe(false);
        if (["kebab", "water"].includes(id))
          expect(q.has("sellerType")).toBe(false);
        const items = ["machine", "shop", "fuel"]
          .filter(
            (type) =>
              id !== "kippe" ||
              q.get("sellerType") === "all" ||
              q.get("sellerType") === type,
          )
          .map((type, i) => ({
            id: `node/${i}`,
            sourceType: "node",
            sourceId: String(i),
            lat: 53.0758,
            lon: 8.8072 + i * 0.001,
            names: {},
            name:
              id === "kebab"
                ? `Döner Kebab Spezialitäten und vegetarische Küche am langen Straßenbahnhof ${type}`
                : `Fixture ${type}`,
            fee: "free",
            ...(id === "water"
              ? {
                  category: "water",
                  waterType: "refill",
                  bottle: "no",
                  seasonal: "yes",
                  refillNetwork: "Refill",
                }
              : {}),
            charge: null,
            feeText: null,
            access: "public",
            wheelchair: "unknown",
            openingHours: i === 0 ? "24/7" : null,
            operator: null,
            notes: null,
            tags: {},
            distance: i * 80,
            ...(id === "kebab"
              ? {
                  cuisine: ["kebab"],
                  takeaway: "yes",
                  delivery: "no",
                  dietary: { halal: "no" },
                  website: "javascript:alert(1)",
                  menuUrl: "https://example.com/menu",
                }
              : {}),
            ...(id === "kippe"
              ? {
                  sellerType: type,
                  hoursAssumed: type === "machine",
                  tobaccoSales: type !== "machine" ? "unconfirmed" : "mapped",
                  paymentMethods: { cash: "yes" },
                  brand: "Fixture brand",
                }
              : {}),
          }))
          .filter(
            (item) =>
              q.get("openNow") !== "true" || item.openingHours === "24/7",
          );
        return route.fulfill({ json: { items, dataset, truncated: false } });
      });
      await page.goto(`http://${id}.localhost:5173/`);
      await expect(page.locator("html")).toHaveAttribute("data-site", id);
      await expect(page.locator(".brand").first()).toContainText(
        id === "loo" ? "find a loo" : id,
      );
      await page.getByRole("button", { name: "Bremen", exact: true }).click();
      await expect(page.locator(".result-row")).toHaveCount(3);
      await expect(page.locator(".radius-control select")).toHaveValue("500");
      if (id === "water") {
        await expect(page.locator(".fee-filters")).toBeVisible();
        await page.locator(".result-select").first().click();
        await expect(page.locator(".detail-panel")).toContainText(
          "Bottle filling",
        );
        await expect(page.locator(".detail-panel")).toContainText("Refill");
      }
      if (id === "kebab") {
        await expect(page.locator(".fee-filters")).toHaveCount(0);
        await page.locator(".result-select").first().click();
        await expect(page.locator(".detail-panel")).toContainText("Takeaway");
        await expect(page.locator(".detail-panel")).toContainText("Halal: No");
        await expect(
          page.locator('.detail-panel a[href^="javascript:"]'),
        ).toHaveCount(0);
        await expect(page.locator(".food-link")).toHaveAttribute(
          "href",
          "https://example.com/menu",
        );
      }
      if (id === "kippe") {
        await page
          .getByRole("button", { name: "Machine", exact: true })
          .click();
        await expect(page.locator(".result-row")).toHaveCount(1);
        await page.locator(".result-select").first().click();
        await expect(page.locator(".detail-panel")).toContainText(
          "Mapped payment",
        );
        await expect(page.locator(".detail-panel")).toContainText(
          "do not guarantee",
        );
        await expect(page.locator(".detail-panel")).not.toContainText(
          "Entry fee",
        );
        await expect(page.locator(".detail-panel")).toContainText(
          "24/7 assumed",
        );
        await page.getByRole("button", { name: "Shop", exact: true }).click();
        await expect(page.locator(".result-row")).toHaveCount(1);
        await page.locator(".result-select").first().click();
        await expect(page.locator(".detail-panel")).not.toContainText(
          "Tobacco sales",
        );
        await page
          .getByRole("button", { name: "Petrol station", exact: true })
          .click();
        await expect(page.locator(".result-row")).toHaveCount(1);
        await expect(page.locator(".result-row")).not.toContainText(
          "unconfirmed",
        );
        await page.locator(".result-select").first().click();
        await expect(page.locator(".detail-panel")).not.toContainText(
          "Tobacco sales",
        );
        await page
          .getByRole("button", { name: "Machine", exact: true })
          .click();
        await expect(page.locator(".seller-filters")).toBeVisible();
      }
      await page.locator(".radius-control select").selectOption("5000");
      await expect(page.locator(".search-boundary")).toHaveCount(1);
      await page.locator(".open-now-control input").check();
      await expect(page.locator(".result-row")).toHaveCount(1);
      for (const locale of ["de", "ro", "en"]) {
        await page.locator("#language").selectOption(locale);
        await page.evaluate(() => document.fonts.ready);
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await page.locator("#hero-title").scrollIntoViewIfNeeded();
        const covered = await page
          .locator("#hero-title")
          .evaluate((heading) => {
            const text = heading.firstChild!;
            const range = document.createRange();
            const covered: string[] = [];
            for (let i = 0; i < (text.textContent?.length || 0); i++) {
              if (!text.textContent![i].trim()) continue;
              range.setStart(text, i);
              range.setEnd(text, i + 1);
              const rect = range.getBoundingClientRect();
              const top = document.elementFromPoint(
                rect.x + rect.width / 2,
                rect.y + rect.height / 2,
              );
              if (!top || !heading.contains(top))
                covered.push(text.textContent![i]);
            }
            return covered;
          });
        expect(
          covered,
          `${id} ${locale} ${width}px heading remains readable`,
        ).toEqual([]);
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth <= innerWidth &&
              document.body.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await expect(page.locator("footer")).toBeAttached();
        if (id === "kebab")
          await page.screenshot({
            path: `/private/tmp/bloli-kebab-${width}-${locale}.png`,
            fullPage: true,
          });
      }
      await page.screenshot({
        path: `/private/tmp/bloli-${id}-${width}.png`,
        fullPage: true,
      });
    });
  }
}
