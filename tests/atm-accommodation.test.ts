import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAtm } from "../src/shared/atm.js";
import { normalizeAccommodation } from "../src/shared/accommodation.js";
import { parseSearch } from "../src/shared/domain.js";
import { isOpenNow } from "../src/server/opening-hours.js";
import type { SourceRecord } from "../src/shared/types.js";
const record = (tags: Record<string, string>): SourceRecord => ({
  sourceType: "node",
  sourceId: "123",
  lat: 48.14,
  lon: 11.47,
  tags,
});
test('embedded ATM mapped hours override the bank schedule in both directions',()=>{
 const open=normalizeAtm(record({amenity:'bank',atm:'yes',opening_hours:'off','opening_hours:atm':'24/7'}))!;
 const closed=normalizeAtm(record({amenity:'bank',atm:'yes',opening_hours:'24/7','opening_hours:atm':'off'}))!;
 assert.equal(open.openingHours,'24/7');assert.equal(closed.openingHours,'off');
 assert.equal(isOpenNow(open,new Date('2026-10-29T20:00:00Z')),true);
 assert.equal(isOpenNow(closed,new Date('2026-10-29T20:00:00Z')),false);
 assert.equal(normalizeAtm(record({amenity:'bank',atm:'yes','opening_hours:atm':'24/7','opening_hours:atm:conditional':'off @ (PH)'}))?.openingHours,null);
});
test("ATM requires evidence and never duplicates an atm=separate host", () => {
  assert.equal(normalizeAtm(record({ amenity: "bank" })), null);
  assert.equal(
    normalizeAtm(record({ amenity: "bank", atm: "separate" })),
    null,
  );
  assert.equal(normalizeAtm(record({ amenity: "atm" }))?.atm?.embedded, false);
  assert.equal(
    normalizeAtm(record({ shop: "supermarket", atm: "yes" }))?.atm?.embedded,
    true,
  );
});
test("ATM namespaces avoid host operator and fee assumptions", () => {
  const item = normalizeAtm(
    record({
      shop: "supermarket",
      atm: "yes",
      operator: "Grocer",
      fee: "yes",
      opening_hours: "09:00-18:00",
      "atm:currency": "EUR;RON",
      "atm:cash_in": "yes",
      "name:hu": "Pénzautomata",
    }),
  )!;
  assert.equal(item.operator, null);
  assert.equal(item.fee, "unknown");
  assert.equal(item.openingHours, "09:00-18:00");
  assert.deepEqual(item.atm?.currencies, ["EUR", "RON"]);
  assert.equal(item.atm?.deposit, "yes");
  assert.equal(item.names.hu, "Pénzautomata");
  assert.equal(normalizeAtm(record({ amenity: "atm" }))?.openingHours, null);
});
test("ATM exclusions override positive evidence", () => {
  for (const extra of [
    { access: "private" },
    { cash_withdrawal: "no" },
    { "disused:amenity": "atm" },
    { locked: "yes" },
    { "access:conditional": "yes @ (Mo)" },
  ] as Record<string, string>[])
    assert.equal(normalizeAtm(record({ amenity: "atm", ...extra })), null);
});
test("Stay accepts exact lodging types and preserves honest detail semantics", () => {
  for (const tourism of [
    "hotel",
    "motel",
    "guest_house",
    "hostel",
    "apartment",
    "chalet",
    "camp_site",
    "caravan_site",
  ])
    assert.equal(
      normalizeAccommodation(record({ tourism }))?.accommodation?.type,
      tourism,
    );
  for (const tourism of ["camp_pitch", "attraction", "alpine_hut"])
    assert.equal(normalizeAccommodation(record({ tourism })), null);
  const stay = normalizeAccommodation(
    record({
      tourism: "hotel",
      stars: "4",
      "opening_hours:reception": "08:00-18:00",
      website: "javascript:bad",
      access: "customers",
    }),
  )!;
  assert.equal(stay.accommodation?.stars, "4");
  assert.equal(stay.accommodation?.receptionHours, "08:00-18:00");
  assert.equal(stay.website, null);
  assert.equal(stay.fee, "unknown");
  assert.equal(
    normalizeAccommodation(record({ tourism: "hotel", access: "private" })),
    null,
  );
});
test("New query filters are validated and host-scoped", () => {
  const q = (extra: string) => new URLSearchParams("lat=48&lon=11&" + extra);
  assert.equal(
    parseSearch(q("currency=EUR&deposit=yes&fee=unknown"), "atm").currency,
    "EUR",
  );
  assert.equal(
    parseSearch(q("accommodationType=hostel"), "accommodation")
      .accommodationType,
    "hostel",
  );
  for (const extra of ["openNow=true", "fee=all", "currency=EUR"])
    assert.throws(() => parseSearch(q(extra), "accommodation"));
  assert.throws(() => parseSearch(q("currency=EURO"), "atm"));
  assert.throws(() => parseSearch(q("currency=EUR&currency=RON"), "atm"));
  assert.throws(() => parseSearch(q("deposit=yes"), "toilets"));
});
