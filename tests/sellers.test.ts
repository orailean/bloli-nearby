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
test("tobacco classifiers preserve seller type", () => {
  for (const [tags, type] of [
    [{ amenity: "vending_machine", vending: "drinks;cigarettes" }, "machine"],
    [{ shop: "tobacco" }, "shop"],
    [{ shop: "kiosk", tobacco: "yes" }, "shop"],
    [{ amenity: "fuel", "sells:tobacco": "yes" }, "fuel"],
  ] as const)
    assert.equal(normalizeSeller(record(tags))?.sellerType, type);
  for (const tags of [
    { shop: "bakery", name: "Tabakladen" },
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

test("machines default to assumed 24/7 only when mapped hours are absent", () => {
  const machine = normalizeSeller(
    record({ amenity: "vending_machine", vending: "cigarettes" }),
  )!;
  assert.equal(machine.openingHours, "24/7");
  assert.equal(machine.hoursAssumed, true);
  const mapped = normalizeSeller(
    record({
      amenity: "vending_machine",
      vending: "cigarettes",
      opening_hours: "Mo-Fr 09:00-17:00",
    }),
  )!;
  assert.equal(mapped.openingHours, "Mo-Fr 09:00-17:00");
  assert.ok(!mapped.hoursAssumed);
});

test("petrol stations without sales evidence are clearly unconfirmed", () => {
  const fuel = normalizeSeller(record({ amenity: "fuel" }))!;
  assert.equal(fuel.sellerType, "fuel");
  assert.equal(fuel.tobaccoSales, "unconfirmed");
  assert.equal(
    normalizeSeller(record({ amenity: "fuel", tobacco: "yes" }))?.tobaccoSales,
    "mapped",
  );
  assert.equal(
    normalizeSeller(record({ amenity: "fuel", tobacco: "no" })),
    null,
  );
});

test("requested retail categories assume sales but retain source evidence and explicit exclusions", () => {
  for (const shop of [
    "lottery",
    "kiosk",
    "convenience",
    "supermarket",
    "newsagent",
  ]) {
    const seller = normalizeSeller(record({ shop }))!;
    assert.equal(seller?.sellerType, "shop", shop);
    assert.equal(seller.tobaccoSales, "unconfirmed", shop);
    assert.equal(seller.openingHours, null, shop);
    for (const restriction of [
      { tobacco: "no" },
      { "sells:tobacco": "no" },
      { access: "private" },
      { disused: "yes" },
    ] as Array<Record<string, string>>)
      assert.equal(normalizeSeller(record({ shop, ...restriction })), null);
  }
  assert.equal(
    normalizeSeller(record({ shop: "stationery", lottery: "yes" }))?.sellerType,
    "shop",
  );
  assert.equal(
    normalizeSeller(record({ shop: "supermarket", tobacco: "yes" }))
      ?.tobaccoSales,
    "mapped",
  );
  assert.equal(
    normalizeSeller(record({ shop: "bakery", name: "Lotto" })),
    null,
  );
  assert.equal(
    normalizeSeller(record({ amenity: "gambling", lottery: "yes" })),
    null,
  );
});
