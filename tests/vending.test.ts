import test from "node:test";
import assert from "node:assert/strict";
import { categoryImports } from "../src/server/category-imports.js";
import { parseSearch } from "../src/shared/domain.js";
import { resolveSite } from "../src/shared/sites.js";
import type { SourceRecord } from "../src/shared/types.js";
const record = (tags: Record<string, string>): SourceRecord => ({
  sourceType: "node",
  sourceId: "123",
  lat: 48,
  lon: 11,
  tags: { amenity: "vending_machine", ...tags },
});
const normalize = (tags: Record<string, string>) =>
  categoryImports.vending?.normalize(record(tags));
test("Vend resolves its own host and preserves missing hours and product information", () => {
  assert.equal(resolveSite("vend.bloli.com", true)?.category, "vending");
  const item = normalize({});
  assert.ok(item);
  assert.equal(item.openingHours, null);
  assert.equal(item.access, "unknown");
  assert.deepEqual(item.vending?.products, []);
  assert.deepEqual(item.vending?.payments, []);
});
test("vending supports multiple products and only explicitly mapped payment methods", () => {
  const item = normalize({
    vending: " drinks ; snacks; drinks ; bicycle_tube",
    "payment:coins": "yes",
    "payment:visa": "yes",
    "payment:cash": "no",
  });
  assert.deepEqual(item?.vending?.products, [
    "drinks",
    "snacks",
    "bicycle_tube",
  ]);
  assert.deepEqual(item?.vending?.groups, ["drinks", "snacks", "other"]);
  assert.deepEqual(item?.vending?.payments, ["card"]);
  assert.equal(
    normalize({ "payment:coins": "yes" })?.vending?.payments.includes("cash"),
    true,
  );
  assert.deepEqual(
    normalize({ "payment:visa": "yes", "payment:credit_cards": "no" })?.vending
      ?.payments,
    [],
  );
});
test("vending rejects restricted, inactive and unrelated features", () => {
  for (const tags of [
    { access: "private" },
    { access: "no" },
    { locked: "yes" },
    { "access:conditional": "yes @ (Mo-Fr)" },
    { disused: "yes" },
    { "disused:vending": "drinks" },
    { amenity: "cafe", vending: "drinks" },
  ] as Record<string, string>[])
    assert.equal(normalize(tags), null);
});
test("vending filters are validated and isolated from the other sites", () => {
  const query = (s: string) => new URLSearchParams("lat=48&lon=11&" + s);
  assert.equal(
    parseSearch(
      query("product=drinks&payment=card&vendAccess=public&openNow=true"),
      "vending",
    ).product,
    "drinks",
  );
  for (const s of [
    "product=nope",
    "product=drinks&product=snacks",
    "payment=bitcoin",
    "vendAccess=private",
    "fee=free",
    "viewType=tower",
  ])
    assert.throws(() => parseSearch(query(s), "vending"), /INVALID_QUERY/);
  for (const s of ["product=all", "payment=all", "vendAccess=all"])
    assert.throws(() => parseSearch(query(s), "toilets"), /INVALID_QUERY/);
});
