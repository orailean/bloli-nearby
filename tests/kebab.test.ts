import test from "node:test";
import assert from "node:assert/strict";
import { normalizeKebab, safeHttpUrl } from "../src/shared/kebab.js";
import { parseSearch } from "../src/shared/domain.js";
import { resolveSite } from "../src/shared/sites.js";
const record = (tags: Record<string, string>) => ({
  sourceType: "node" as const,
  sourceId: "8",
  lat: 48.1391,
  lon: 11.4729,
  tags,
});
test("Kebab includes mapped cuisine tokens and fixed food venues only", () => {
  for (const cuisine of ["kebab", "DÖNER", "pizza; kebab", "doner", "doener"]) {
    const p = normalizeKebab(record({ amenity: "fast_food", cuisine }))!;
    assert.equal(p?.category, "kebab");
    assert.equal(p.sourceId, "8");
    assert.ok(p.cuisine?.length);
  }
  for (const tags of [
    { amenity: "restaurant", cuisine: "turkish", name: "Döner" },
    { amenity: "cafe", cuisine: "kebab" },
    { shop: "supermarket", cuisine: "kebab" },
    { amenity: "restaurant", cuisine: "kebabish" },
  ] as Array<Record<string, string>>)
    assert.equal(normalizeKebab(record(tags)), null);
  assert.equal(
    normalizeKebab(record({ amenity: "restaurant", cuisine: "kebab" }))
      ?.category,
    "kebab",
  );
});
test("Kebab excludes inaccessible and inactive venues and does not assume hours", () => {
  const base = { amenity: "fast_food", cuisine: "kebab" };
  for (const restriction of [
    { access: "private" },
    { access: "no" },
    { disused: "yes" },
    { abandoned: "yes" },
    { locked: "yes" },
    { "access:conditional": "no @ (Mo)" },
    { "disused:amenity": "fast_food" },
    { type: "route" },
  ] as Array<Record<string, string>>)
    assert.equal(normalizeKebab(record({ ...base, ...restriction })), null);
  const p = normalizeKebab(record({ ...base, access: "customers" }))!;
  assert.equal(p.openingHours, null);
  assert.ok(!p.hoursAssumed);
  assert.equal(p.access, "customers");
  assert.equal(
    normalizeKebab(record({ ...base, opening_hours: "Mo-Sa 10:00-23:00" }))
      ?.openingHours,
    "Mo-Sa 10:00-23:00",
  );
});
test("Kebab preserves mapped food details without inferred dietary claims", () => {
  const p = normalizeKebab(
    record({
      amenity: "fast_food",
      cuisine: "kebab",
      takeaway: "yes",
      delivery: "no",
      "diet:vegan": "no",
      "payment:cash": "yes",
      "website:menu": "https://example.org/menu",
      "contact:website": "https://example.org",
      name: "Example",
      "name:ro": "Exemplu",
    }),
  )!;
  assert.equal(p.takeaway, "yes");
  assert.equal(p.delivery, "no");
  assert.deepEqual(p.dietary, { vegan: "no" });
  assert.deepEqual(p.paymentMethods, { cash: "yes" });
  assert.equal(p.menuUrl, "https://example.org/menu");
  assert.equal(p.website, "https://example.org/");
  assert.equal(p.names.ro, "Exemplu");
  assert.ok(!Object.hasOwn(p.dietary!, "halal"));
});
test("Website and menu URLs allow only valid HTTP(S) destinations", () => {
  for (const s of [
    "javascript:alert(1)",
    "data:text/html,a",
    "//example.org",
    "file:///tmp/menu",
    "https://user:pass@example.org",
    "not a URL",
  ])
    assert.equal(safeHttpUrl(s), null);
  assert.equal(
    safeHttpUrl(" https://example.org/menu "),
    "https://example.org/menu",
  );
  const p = normalizeKebab(
    record({
      amenity: "fast_food",
      cuisine: "kebab",
      website: "javascript:alert(1)",
      "website:menu": "data:text/html,a",
    }),
  )!;
  assert.equal(p.website, null);
  assert.equal(p.menuUrl, null);
});
test("Kebab host binding and query capabilities remain isolated", () => {
  assert.equal(resolveSite("kebab.bloli.com", true)?.category, "kebab");
  assert.equal(resolveSite("kebab.localhost:5173", false)?.id, "kebab");
  assert.equal(resolveSite("other.bloli.com", true), null);
  assert.equal(resolveSite("kebab.localhost:5173", true), null);
  const query = "lat=48.1&lon=11.4";
  assert.equal(parseSearch(new URLSearchParams(query), "kebab").radius, 500);
  for (const suffix of [
    "&fee=all",
    "&sellerType=all",
    "&category=tobacco",
    "&openNow=true&openNow=false",
  ])
    assert.throws(() =>
      parseSearch(new URLSearchParams(query + suffix), "kebab"),
    );
});
