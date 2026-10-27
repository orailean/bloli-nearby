import test from "node:test";
import assert from "node:assert/strict";
import { normalizeWater } from "../src/shared/water.js";
import { resolveSite } from "../src/shared/sites.js";
import { parseSearch } from "../src/shared/domain.js";
import { isOpenNow } from "../src/server/opening-hours.js";
const record = (tags: Record<string, string | undefined>) => ({
  sourceType: "node" as const,
  sourceId: "42",
  lat: 48.139,
  lon: 11.473,
  tags: Object.fromEntries(
    Object.entries(tags).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  ),
});
test("Water includes explicit potable and refill evidence only", () => {
  for (const tags of [
    { amenity: "drinking_water" },
    { drinking_water: "yes", natural: "spring" },
    { amenity: "fountain", fountain: "drinking" },
    { shop: "bakery", "drinking_water:refill": "yes", access: "customers" },
  ]) {
    const p = normalizeWater(
      record(tags as Record<string, string | undefined>),
    )!;
    assert.equal(p?.category, "water");
    assert.equal(p.id, "node/42");
    assert.equal(p.openingHours, null);
    assert.ok(!p.hoursAssumed);
  }
  for (const tags of [
    { amenity: "fountain" },
    { natural: "spring" },
    { man_made: "water_tap" },
    { amenity: "water_point" },
    { name: "Trinkwasser" },
    { "drinking_water:legal": "yes" },
  ])
    assert.equal(
      normalizeWater(record(tags as Record<string, string | undefined>)),
      null,
    );
});
test("Water negatives override positive evidence", () => {
  for (const negative of [
    { drinking_water: "no" },
    { drinking_water: "conditional" },
    { drinking_water: "unknown" },
    { "drinking_water:legal": "no" },
    { access: "private" },
    { access: "customers" },
    { "access:conditional": "no @ (Mo)" },
    { locked: "yes" },
    { centralkey: "yes" },
    { disused: "yes" },
    { "disused:amenity": "drinking_water" },
    { type: "route" },
    { type: "collection" },
  ])
    assert.equal(
      normalizeWater(
        record({ amenity: "drinking_water", ...negative } as Record<
          string,
          string | undefined
        >),
      ),
      null,
      JSON.stringify(negative),
    );
});
test("Water keeps fees scoped to water and preserves mapped details", () => {
  const p = normalizeWater(
    record({
      shop: "bakery",
      "drinking_water:refill": "yes",
      fee: "yes",
      access: "customers",
      seasonal: "yes",
      bottle: "no",
      "drinking_water:refill:network": "Refill",
      opening_hours: "09:00-17:00",
      "opening_hours:drinking_water": "10:00-12:00",
      "name:ro": "Apă",
    }),
  )!;
  assert.equal(p.fee, "unknown");
  assert.equal(p.access, "customers");
  assert.equal(p.waterType, "refill");
  assert.equal(p.openingHours, "10:00-12:00");
  assert.equal(p.bottle, "no");
  assert.equal(p.refillNetwork, "Refill");
  assert.equal(p.names.ro, "Apă");
  assert.equal(
    normalizeWater(record({ amenity: "drinking_water", fee: "no" }))?.fee,
    "free",
  );
  assert.equal(
    normalizeWater(
      record({
        amenity: "cafe",
        "drinking_water:refill": "yes",
        "drinking_water:fee": "yes",
      }),
    )?.fee,
    "paid",
  );
  assert.equal(
    normalizeWater(
      record({
        amenity: "drinking_water",
        fee: "no",
        "fee:conditional": "yes @ (Mo)",
      }),
    )?.fee,
    "unknown",
  );
});
test("Water seasonal daily hours are unconfirmed, explicit month schedules work", () => {
  const at = new Date("2026-07-06T10:30:00Z");
  for (const opening_hours of ["24/7", "Mo-Su 09:00-18:00"])
    assert.equal(
      isOpenNow(
        normalizeWater(
          record({ amenity: "drinking_water", seasonal: "yes", opening_hours }),
        )!,
        at,
      ),
      false,
    );
  const p = normalizeWater(
    record({
      amenity: "drinking_water",
      seasonal: "yes",
      opening_hours: "Apr-Oct Mo-Su 09:00-18:00",
    }),
  )!;
  assert.equal(isOpenNow(p, at), true);
  assert.equal(isOpenNow(p, new Date("2026-12-07T11:30:00Z")), false);
  assert.equal(
    isOpenNow(
      normalizeWater(
        record({ amenity: "drinking_water", opening_hours: "24/7" }),
      )!,
      at,
    ),
    true,
  );
});
test("Water host and fee capabilities are isolated", () => {
  assert.equal(resolveSite("water.bloli.com", true)?.category, "water");
  assert.equal(resolveSite("water.localhost:5173")?.id, "water");
  assert.equal(
    parseSearch(new URLSearchParams("lat=48&lon=11&fee=free"), "water").radius,
    500,
  );
  assert.throws(() =>
    parseSearch(new URLSearchParams("lat=48&lon=11&sellerType=all"), "water"),
  );
});
test("Water excludes inactive non-amenity sources", () => {
  for (const tags of [
    { drinking_water: "yes", "disused:man_made": "water_tap" },
    { drinking_water: "yes", "abandoned:natural": "spring" },
    { "drinking_water:refill": "yes", "disused:shop": "bakery" },
    { "drinking_water:refill": "yes", "disused:drinking_water:refill": "yes" },
  ])
    assert.equal(normalizeWater(record(tags)), null);
});
test("Seasonal daily opening with unrelated month closure stays unconfirmed", () => {
  const p = normalizeWater(
    record({
      amenity: "drinking_water",
      seasonal: "yes",
      opening_hours: "Mo-Su 09:00-18:00; Jan 01 off",
    }),
  )!;
  assert.equal(isOpenNow(p, new Date("2026-12-07T11:30:00Z")), false);
  const mixed = normalizeWater(
    record({
      amenity: "drinking_water",
      seasonal: "yes",
      opening_hours: "Apr-Oct 09:00-12:00; Mo-Su 13:00-18:00",
    }),
  )!;
  assert.equal(isOpenNow(mixed, new Date("2026-12-07T14:30:00Z")), false);
});
