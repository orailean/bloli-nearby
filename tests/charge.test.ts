import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCharge, parseChargePower } from "../src/shared/charge.js";
import { parseSearch, directionsUrl } from "../src/shared/domain.js";
import { resolveSite } from "../src/shared/sites.js";
import { isOpenNow } from "../src/server/opening-hours.js";
import type { SourceRecord } from "../src/shared/types.js";
const record = (tags: Record<string, string> = {}): SourceRecord => ({
  sourceType: "node",
  sourceId: "1",
  lat: 48.14,
  lon: 11.57,
  tags: { amenity: "charging_station", ...tags },
});
test("Charge includes public/customer/unknown car stations with access evidence", () => {
  assert.equal(normalizeCharge(record({ access: "public" }))?.access, "public");
  const customer = normalizeCharge(
    record({
      access: "customers",
      "socket:type2_combo": "2",
      "socket:type2_combo:output": "150 kW",
    }),
  )!;
  assert.equal(customer.access, "customers");
  assert.equal(customer.charging?.accessRestriction, "customers");
  assert.equal(customer.charging?.connectors[0].outputKw, 150);
  assert.equal(normalizeCharge(record())?.access, "unknown");
  assert.equal(
    normalizeCharge(record({ motorcar: "yes", bicycle: "yes" }))?.category,
    "charge",
  );
});
test("Charge explicit restrictions/lifecycle/car negatives override socket evidence", () => {
  for (const tags of [
    { motorcar: "no" },
    { access: "private" },
    { access: "permit" },
    { motor_vehicle: "no" },
    { "access:conditional": "yes @ (Mo-Fr)" },
    { locked: "yes" },
    { construction: "charging_station" },
    { "construction:amenity": "charging_station" },
    { disused: "yes" },
    { amenity: "construction" },
    { type: "route" },
    { type: "destination_sign" },
    { bicycle: "designated", "socket:bosch_3pin": "4" },
  ] as Record<string, string>[])
    assert.equal(
      normalizeCharge(
        record({ ...tags, "socket:type2_combo": tags.bicycle ? "0" : "2" }),
      ),
      null,
      JSON.stringify(tags),
    );
  assert.equal(
    normalizeCharge(
      record({
        amenity: "",
        man_made: "charge_point",
        motorcar: "yes",
        "socket:type2": "2",
      }),
    ),
    null,
  );
});
test("Charge socket counts and power parsing do not invent compatibility", () => {
  for (const [raw, want] of [
    ["150 kW", 150],
    ["150000 W", 150],
    ["0.3 MW", 300],
    ["22", 22],
    ["7,4 kW", 7.4],
    ["0", null],
    ["-1 kW", null],
    ["22;50", null],
    ["up to 150 kW", null],
    ["50-150 kW", null],
    ["Infinity", null],
  ] as const)
    assert.equal(parseChargePower(raw), want, raw);
  const item = normalizeCharge(
    record({
      "socket:type2": "no",
      "socket:type2_combo": "yes",
      "socket:type2_combo:output": "150 kW",
      "socket:chademo": "0",
      "socket:unknown": "2",
    }),
  )!;
  assert.equal(item.charging?.connectors.length, 1);
  assert.equal(item.charging?.connectors[0].count, null);
  assert.equal(
    normalizeCharge(record({ brand: "Tesla" }))?.charging?.connectors.length,
    0,
  );
  const conditional = normalizeCharge(
    record({
      "socket:type2_combo": "2",
      "socket:type2_combo:output": "150 kW",
      "socket:type2_combo:output:conditional": "50 kW @ (Mo-Fr)",
    }),
  )!;
  assert.equal(conditional.charging?.connectors[0].outputKw, null);
  const ccs = normalizeCharge(
    record({
      "socket:ccs": "2",
      "socket:ccs:output": "150 kW",
      "socket:tesla_supercharger_ccs": "4",
      "socket:tesla_supercharger_ccs:output": "250 kW",
    }),
  )!;
  assert.deepEqual(
    ccs.charging?.connectors.map((s) => s.type),
    ["ccs", "ccs"],
  );
});
test("Charge preserves mapped details and separates parking fees", () => {
  const item = normalizeCharge(
    record({
      fee: "no",
      "parking:fee": "yes",
      capacity: "4",
      "payment:credit_cards": "yes",
      "authentication:app": "yes",
      network: "Example",
      opening_hours: "24/7",
      website: "javascript:alert(1)",
    }),
  )!;
  assert.equal(item.fee, "free");
  assert.equal(item.charging?.parkingFee, "yes");
  assert.equal(item.charging?.capacity, 4);
  assert.equal(item.paymentMethods?.credit_cards, "yes");
  assert.equal(item.charging?.authenticationMethods.app, "yes");
  assert.equal(item.website, null);
  assert.equal(normalizeCharge(record())?.openingHours, null);
  assert.equal(
    normalizeCharge(record({ "fee:conditional": "no @ (Su)" }))?.fee,
    "unknown",
  );
});
test("Charge queries validate connector-local options and isolate other hosts", () => {
  const base = "lat=48.14&lon=11.57";
  const q = parseSearch(
    new URLSearchParams(
      base + "&connector=type2&minPowerKw=150&chargeAccess=customers&fee=free",
    ),
    "charge",
  );
  assert.equal(q.connector, "type2");
  assert.equal(q.minPowerKw, 150);
  assert.equal(q.chargeAccess, "customers");
  assert.equal(q.radius, 500);
  assert.equal(resolveSite("charge.bloli.com", true)?.category, "charge");
  for (const suffix of [
    "connector=type2&connector=ccs",
    "minPowerKw=149",
    "minPowerKw=",
    "chargeAccess=private",
    "sellerType=all",
    "mode=all",
  ])
    assert.throws(() =>
      parseSearch(new URLSearchParams(base + "&" + suffix), "charge"),
    );
  for (const category of [
    "toilets",
    "tobacco",
    "kebab",
    "water",
    "transit",
  ] as const)
    for (const suffix of ["connector=all", "minPowerKw=0", "chargeAccess=all"])
      assert.throws(() =>
        parseSearch(new URLSearchParams(base + "&" + suffix), category),
      );
});
test("Charge hours are mapped only and seasonal schedules remain conservative", () => {
  const date = new Date("2026-10-27T12:00:00Z");
  assert.equal(isOpenNow(normalizeCharge(record())!, date), false);
  assert.equal(
    isOpenNow(normalizeCharge(record({ opening_hours: "24/7" }))!, date),
    true,
  );
  assert.equal(
    isOpenNow(
      normalizeCharge(
        record({ seasonal: "yes", opening_hours: "Mo-Su 00:00-24:00" }),
      )!,
      date,
    ),
    false,
  );
  assert.equal(
    isOpenNow(
      normalizeCharge(
        record({
          opening_hours: "24/7",
          "opening_hours:conditional": "off @ (snow)",
        }),
      )!,
      date,
    ),
    false,
  );
});
test("Charge directions use driving while walking stays the shared default", () => {
  assert.match(directionsUrl(48, 11, "driving"), /travelmode=driving/);
  assert.match(directionsUrl(48, 11), /travelmode=walking/);
  assert.doesNotMatch(directionsUrl(48, 11, "driving"), /origin=/);
});
