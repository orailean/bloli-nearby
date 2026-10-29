import test from "node:test";
import assert from "node:assert/strict";
import { COUNTRIES, minimumForCountry } from "../src/shared/countries.js";

test("country registry orders rollout and keeps new countries pending", () => {
  assert.deepEqual(
    COUNTRIES.map(({ code, timezone, initialStatus }) => [
      code,
      timezone,
      initialStatus,
    ]),
    [
      ["de", "Europe/Berlin", "active"],
      ["ro", "Europe/Bucharest", "pending"],
      ["at", "Europe/Vienna", "pending"],
      ["hu", "Europe/Budapest", "pending"],
    ],
  );
  for (const country of COUNTRIES) {
    assert.match(country.sourceUrl, /^https:\/\/download\.geofabrik\.de\//);
    assert.match(country.boundaryUrl, /^https:\/\/download\.geofabrik\.de\//);
  }
});

test("country-specific import floors are configured independently", () => {
  assert.equal(minimumForCountry("de", "toilets", {}), undefined);
  assert.equal(
    minimumForCountry("ro", "toilets", { MIN_RO_TOILETS: "400" }),
    400,
  );
  assert.equal(
    minimumForCountry("ro", "toilets", { MIN_RO_TOILETS: "0" }),
    undefined,
  );
});
