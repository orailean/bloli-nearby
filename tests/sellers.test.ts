import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSeller } from "../src/shared/sellers.js";
const record = (tags: Record<string, string>) => ({
  sourceType: "node" as const,
  sourceId: "1",
  lat: 48.137,
  lon: 11.576,
  tags,
});
test("tobacco classifiers require evidence and preserve seller type", () => {
  for (const [tags, type] of [
    [{ amenity: "vending_machine", vending: "drinks;cigarettes" }, "machine"],
    [{ shop: "tobacco" }, "shop"],
    [{ shop: "kiosk", tobacco: "yes" }, "shop"],
    [{ amenity: "fuel", "sells:tobacco": "yes" }, "fuel"],
  ] as const)
    assert.equal(normalizeSeller(record(tags))?.sellerType, type);
  for (const tags of [
    { amenity: "fuel" },
    { shop: "supermarket" },
    { shop: "kiosk", name: "Tabakladen" },
    { amenity: "vending_machine", vending: "sweets" },
  ] as Array<Record<string, string>>)
    assert.equal(normalizeSeller(record(tags)), null);
});
test("explicit negatives, lifecycle and access restrictions exclude sellers", () => {
  for (const more of [
    { tobacco: "no" },
    { access: "private" },
    { disused: "yes" },
    { abandoned: "yes" },
    { locked: "yes" },
    { "access:conditional": "no @ (Mo-Fr)" },
  ] as Array<Record<string, string>>)
    assert.equal(normalizeSeller(record({ shop: "tobacco", ...more })), null);
});
test("seller details preserve unknown hours and recorded payment methods", () => {
  const seller = normalizeSeller(
    record({
      shop: "tobacco",
      "payment:cash": "yes",
      "payment:debit_cards": "no",
      brand: "Example",
    }),
  )!;
  assert.equal(seller.openingHours, null);
  assert.deepEqual(seller.paymentMethods, { cash: "yes", debit_cards: "no" });
  assert.equal(seller.brand, "Example");
});

test("customer-only access is preserved", () => {
  assert.equal(
    normalizeSeller(record({ shop: "tobacco", access: "customers" }))?.access,
    "customers",
  );
});
