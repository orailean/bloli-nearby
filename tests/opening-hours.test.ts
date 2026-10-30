import test from "node:test";
import assert from "node:assert/strict";
import { isOpenNow } from "../src/server/opening-hours.js";
const facility = (openingHours: string | null) => ({
  openingHours,
  lat: 48.137,
  lon: 11.576,
  tags: {},
});
test("open now excludes closed, missing, malformed and uncertain schedules", () => {
  const at = new Date("2026-10-26T11:00:00Z");
  for (const hours of [
    null,
    "",
    "off",
    "not valid hours",
    "unknown",
    '"by appointment"',
  ])
    assert.equal(isOpenNow(facility(hours), at), false, String(hours));
  assert.equal(isOpenNow(facility("24/7"), at), true);
});
test("German local time handles winter, summer and overnight opening", () => {
  assert.equal(
    isOpenNow(facility("Mo 12:00-13:00"), new Date("2026-10-26T11:30:00Z")),
    true,
  );
  assert.equal(
    isOpenNow(facility("Mo 12:00-13:00"), new Date("2026-10-26T12:30:00Z")),
    false,
  );
  assert.equal(
    isOpenNow(facility("Mo 12:00-13:00"), new Date("2026-07-06T10:30:00Z")),
    true,
  );
  assert.equal(
    isOpenNow(facility("Mo 22:00-02:00"), new Date("2026-10-26T23:30:00Z")),
    true,
  );
});
test("mixed-country schedules use each facility's timezone at the same instant", () => {
  const munich = {
    ...facility("Mo 12:00-13:00"),
    timezone: "Europe/Berlin",
    countryCode: "de",
  } as Parameters<typeof isOpenNow>[0];
  const bucharest = {
    ...facility("Mo 12:00-13:00"),
    timezone: "Europe/Bucharest",
    countryCode: "ro",
  } as Parameters<typeof isOpenNow>[0];
  const instant = new Date("2026-10-26T10:30:00Z");
  assert.equal(isOpenNow(munich, instant), false);
  assert.equal(isOpenNow(bucharest, instant), true);
  assert.equal(isOpenNow(munich, instant), false, "request order is stable");
});
test("Romanian opening before the DST jump uses 02:30 while Germany stays closed", () => {
  const munich = {
    ...facility("Su 02:00-03:00"),
    timezone: "Europe/Berlin",
    countryCode: "de",
  } as Parameters<typeof isOpenNow>[0];
  const bucharest = {
    ...facility("Su 02:00-03:00"),
    timezone: "Europe/Bucharest",
    countryCode: "ro",
  } as Parameters<typeof isOpenNow>[0];
  const beforeEuropeanDstJump = new Date("2026-03-29T00:30:00Z");
  assert.equal(isOpenNow(bucharest, beforeEuropeanDstJump), true);
  assert.equal(isOpenNow(munich, beforeEuropeanDstJump), false);
  assert.equal(isOpenNow(bucharest, beforeEuropeanDstJump), true);
  // Bucharest's 03:00-04:00 is skipped by the spring transition.
  assert.equal(isOpenNow({...bucharest, openingHours:"Su 03:00-04:00"}, beforeEuropeanDstJump), false);
  assert.equal(isOpenNow(bucharest, new Date("2026-03-29T01:30:00Z")), false);
});
test("holiday-dependent schedules without state context remain uncertain", () => {
  assert.equal(
    isOpenNow(
      facility("Mo-Su 00:00-24:00; PH off"),
      new Date("2026-10-26T11:00:00Z"),
    ),
    false,
  );
});
