import test from "node:test";
import assert from "node:assert/strict";
import { categoryImports } from "../src/server/category-imports.js";
import { parseSearch } from "../src/shared/domain.js";
import { resolveSite } from "../src/shared/sites.js";
const normalize = (tags: Record<string, string>) =>
  categoryImports.parking?.normalize({
    sourceType: "way",
    sourceId: "123",
    lat: 48,
    lon: 11,
    tags: { amenity: "parking", ...tags },
  });
test("parking preserves unknown facts and driving profile", () => {
  assert.equal(resolveSite("park.bloli.com", true)?.directionsMode, "driving");
  const p = normalize({});
  assert.ok(p);
  assert.equal(p.fee, "unknown");
  assert.equal(p.openingHours, null);
  assert.equal(p.parking?.type, "unknown");
  assert.equal(p.parking?.capacity, null);
});
test("parking classifies mapped attributes conservatively", () => {
  const p = normalize({
    parking: "underground",
    capacity: "42",
    "capacity:disabled": "2",
    fee: "yes",
    park_ride: "yes",
    hiking: "yes",
    maxstay: "2 hours",
    maxheight: "2.1",
    surface: "asphalt",
  });
  assert.equal(p?.parking?.type, "underground");
  assert.equal(p?.parking?.capacity, 42);
  assert.equal(p?.parking?.disabledCapacity, 2);
  assert.equal(p?.parking?.parkRide, true);
  assert.equal(p?.parking?.hiking, true);
  assert.equal(p?.fee, "paid");
  assert.equal(normalize({ capacity: "~100" })?.parking?.capacity, null);
  assert.equal(
    normalize({ fee: "yes", "fee:conditional": "no @ (Su)" })?.fee,
    "unknown",
  );
  for (const tags of [
    { access: "private" },
    { access: "no" },
    { "access:conditional": "yes @ (Su)" },
    { "disused:amenity": "parking" },
    { amenity: "parking_entrance" },
    { amenity: "parking_space" },
  ] as Record<string, string>[])
    assert.equal(normalize(tags), null);
});
test("parking filters reject duplicates and foreign site parameters", () => {
  const q = (s: string) => new URLSearchParams("lat=48&lon=11&" + s);
  assert.equal(
    parseSearch(
      q(
        "parkingType=underground&parkingAccess=unknown&parkRide=yes&hiking=yes&fee=unknown",
      ),
      "parking",
    ).parkingType,
    "underground",
  );
  for (const s of [
    "parkingType=nope",
    "parkingType=surface&parkingType=unknown",
    "parkingAccess=private",
    "parkRide=no",
    "hiking=yes&hiking=yes",
    "product=all",
  ])
    assert.throws(() => parseSearch(q(s), "parking"), /INVALID_QUERY/);
  for (const key of ["parkingType", "parkingAccess", "parkRide", "hiking"])
    assert.throws(
      () => parseSearch(q(key + "=all"), "toilets"),
      /INVALID_QUERY/,
    );
});
import { searchLocations } from "../src/server/repository.js";
import type pg from "pg";
test("parking SQL filters run before result cap", async () => {
  const calls: { sql: string; values: unknown[] }[] = [];
  const db = {
    query: async (sql: string, values: unknown[] = []) => {
      calls.push({ sql, values });
      if (sql.includes("AS covered"))
        return {
          rows: [
            {
              dataset_at: new Date(),
              imported_at: new Date(),
              covered: true,
              facility_count: 1,
            },
          ],
        };
      return { rows: [] };
    },
    release() {},
  };
  const pool = {
    connect: async () => db,
    query: async () => ({ rows: [] }),
  } as unknown as pg.Pool;
  await searchLocations(
    pool,
    parseSearch(
      new URLSearchParams(
        "lat=48&lon=11&parkingType=underground&parkingAccess=public&parkRide=yes&hiking=yes&limit=1",
      ),
      "parking",
    ),
    "parking",
  );
  const call = calls.find((c) => c.sql.includes("WITH nearby_locations"));
  assert.ok(call);
  assert.ok(
    call.sql.indexOf("c.data->'parking'->>'type'") <
      call.sql.lastIndexOf("LIMIT"),
  );
  assert.deepEqual(call.values.slice(6), [
    "underground",
    "public",
    "yes",
    "yes",
    2,
  ]);
});

test("parking respects vehicle restrictions and explicit mapped entrances", () => {
  assert.equal(normalize({ motorcar: "private" }), null);
  assert.equal(normalize({ "motor_vehicle:conditional": "yes @ (Su)" }), null);
  assert.equal(normalize({ park_ride: "bus" })?.parking?.parkRide, true);
  const r = {
    sourceType: "way" as const,
    sourceId: "123",
    lat: 48,
    lon: 11,
    tags: { amenity: "parking" },
    parkingEntrance: {
      lat: 48.1,
      lon: 11.1,
      sourceType: "node" as const,
      sourceId: "12",
    },
  };
  assert.deepEqual(
    categoryImports.parking.normalize(r)?.parking?.entrance,
    r.parkingEntrance,
  );
  assert.throws(
    () =>
      categoryImports.parking.normalize({
        ...r,
        parkingEntrance: { ...r.parkingEntrance, lat: 100 },
      }),
    /INVALID_QUERY/,
  );
});

test("parking access follows the most specific mapped car access", () => {
  assert.equal(
    normalize({ access: "yes", motorcar: "customers" })?.access,
    "customers",
  );
  assert.equal(normalize({ motorcar: "customers" })?.access, "customers");
  assert.equal(
    normalize({
      access: "customers",
      vehicle: "customers",
      motor_vehicle: "customers",
      motorcar: "yes",
    })?.access,
    "public",
  );
  assert.equal(
    normalize({ access: "yes", vehicle: "customers" })?.access,
    "customers",
  );
  assert.equal(
    normalize({ vehicle: "yes", motor_vehicle: "customers" })?.access,
    "customers",
  );
});
