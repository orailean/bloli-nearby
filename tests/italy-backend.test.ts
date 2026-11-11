import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAtm } from "../src/shared/atm.js";
import { COUNTRIES } from "../src/shared/countries.js";
import { isOpenNow } from "../src/server/opening-hours.js";
test("Italy preserves translated names and evaluates Rome summer time", () => {
 const facility = normalizeAtm({sourceType:"node",sourceId:"1",lat:41.9,lon:12.5,tags:{amenity:"atm","name:it":"Bancomat",opening_hours:"Mo 10:00-11:00"}})!;
 assert.equal(facility.names.it,"Bancomat");
 facility.countryCode="it";
 assert.equal(isOpenNow(facility,new Date("2026-07-06T08:30:00Z")),true);
 assert.equal(isOpenNow(facility,new Date("2026-07-06T10:30:00Z")),false);
 const italy=COUNTRIES.find(c=>c.code==="it")!;
 assert.equal(italy.sourceUrl,"https://download.geofabrik.de/europe/italy-latest.osm.pbf");
 assert.equal(italy.boundaryUrl,"https://download.geofabrik.de/europe/italy.poly");
 assert.equal(italy.storagePath,"/data/countries/it");
 assert.equal(italy.rolloutOrder,4);
});
