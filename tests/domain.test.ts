import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeFacility,
  parseSearch,
  directionsUrl,
} from "../src/shared/domain.js";

test("free and paid are explicit; absent and conditional fees stay unknown", () => {
  const record = (tags: Record<string, string>) =>
    normalizeFacility({
      sourceType: "node",
      sourceId: "1",
      lat: 52.5,
      lon: 13.4,
      tags: { amenity: "toilets", ...tags },
    });
  assert.equal(record({ fee: "no" })?.fee, "free");
  assert.equal(record({ fee: "yes" })?.fee, "paid");
  assert.equal(record({})?.fee, "unknown");
  assert.equal(
    record({ fee: "no", "fee:conditional": "yes @ (Mo-Fr)" })?.fee,
    "unknown",
  );
  assert.equal(record({ fee: "donation" })?.fee, "unknown");
});
test("exclude restrictions including venue restrictions and keyed facilities", () => {
  for (const access of ["private", "no", "customers", "centralkey", "permit"]) {
    assert.equal(
      normalizeFacility({
        sourceType: "way",
        sourceId: "2",
        lat: 52.5,
        lon: 13.4,
        tags: { amenity: "toilets", access },
      }),
      null,
    );
  }
  assert.equal(
    normalizeFacility({
      sourceType: "node",
      sourceId: "3",
      lat: 52.5,
      lon: 13.4,
      tags: { amenity: "cafe", toilets: "yes", "toilets:access": "customers" },
    }),
    null,
  );
  const venue = normalizeFacility({
    sourceType: "node",
    sourceId: "4",
    lat: 52.5,
    lon: 13.4,
    tags: {
      amenity: "cafe",
      toilets: "yes",
      "toilets:access": "yes",
      "toilets:fee": "no",
      fee: "yes",
      "toilets:wheelchair": "limited",
    },
  });
  assert.equal(venue?.fee, "free");
  assert.equal(venue?.wheelchair, "limited");
});
test("source identity and unknown access are retained; invalid coordinates rejected", () => {
  const r = normalizeFacility({
    sourceType: "relation",
    sourceId: "40",
    lat: 54.9,
    lon: 8.3,
    tags: { amenity: "toilets", opening_hours: "24/7" },
  });
  assert.equal(r?.id, "relation/40");
  assert.equal(r?.access, "unknown");
  assert.equal(r?.openingHours, "24/7");
  assert.throws(() =>
    normalizeFacility({
      sourceType: "node",
      sourceId: "1",
      lat: NaN,
      lon: 13,
      tags: { amenity: "toilets" },
    }),
  );
});
test("search defaults and limits cannot be bypassed with malformed values", () => {
  const q = parseSearch(new URLSearchParams({ lat: "52.52", lon: "13.4" }));
  assert.deepEqual(q, {
    lat: 52.52,
    lon: 13.4,
    radius: 2000,
    limit: 100,
    fee: "all",
    openNow: false,
  });
  for (const extra of [
    { radius: "50001" },
    { radius: "0" },
    { limit: "101" },
    { limit: "1.5" },
    { fee: "unknown" },
    { lat: "" },
    { lat: "Infinity" },
    { lon: "190" },
    { radius: "2oops" },
  ] as Array<Record<string, string>>) {
    assert.throws(() =>
      parseSearch(new URLSearchParams({ lat: "52.52", lon: "13.4", ...extra })),
    );
  }
});
test("walking directions contain destination but never the search origin", () => {
  const u = new URL(directionsUrl(52.52, 13.4));
  assert.equal(u.hostname, "www.google.com");
  assert.equal(u.searchParams.get("destination"), "52.52,13.4");
  assert.equal(u.searchParams.get("travelmode"), "walking");
  assert.equal(u.searchParams.has("origin"), false);
});
