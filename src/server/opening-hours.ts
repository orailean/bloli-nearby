import OpeningHours from "opening_hours";
import type { Facility } from "../shared/types.js";
const cache = new Map<string, OpeningHours | null>();
const countryDefaults = {
  de: "Europe/Berlin",
  ro: "Europe/Bucharest",
  at: "Europe/Vienna",
  hu: "Europe/Budapest",
} as const;

function localCalendarDate(at: Date, timezone: string): Date {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  // opening_hours reads native local Date fields. Constructing those fields from
  // the venue's IANA zone preserves the venue's weekday and wall clock without
  // mutating process.env.TZ or changing other requests' evaluation context.
  // API/test runtimes start in UTC so host DST gaps cannot normalize a venue's
  // otherwise valid local hour. Keep TZ=UTC in native scripts and the API image.
  return new Date(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
    value("second"),
    at.getUTCMilliseconds(),
  );
}

export function isOpenNow(
  facility: Pick<
    Facility,
    | "openingHours"
    | "lat"
    | "lon"
    | "tags"
    | "category"
    | "countryCode"
    | "timezone"
  >,
  at = new Date(),
): boolean {
  const hours = facility.openingHours?.trim();
  if (!hours) return false;
  if (
    ["water", "charge"].includes(facility.category || "") &&
    facility.tags.seasonal &&
    facility.tags.seasonal !== "no"
  ) {
    // Every potentially open rule must carry annual bounds. A month in a
    // separate closure (e.g. Jan 01 off) cannot establish an operating season.
    const rules = hours
      .replace(/"[^"]*"/g, "")
      .split(/;|\|\|/)
      .map((rule) => rule.trim())
      .filter(Boolean);
    const openingRules = rules.filter(
      (rule) => !/\b(?:off|closed|unknown)\s*$/.test(rule),
    );
    if (
      !openingRules.length ||
      openingRules.some(
        (rule) =>
          !/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/.test(rule),
      )
    )
      return false;
  }
  if (hours === "24/7") return true;
  const countryCode = facility.countryCode || "de";
  const timezone =
    facility.timezone || countryDefaults[countryCode] || countryDefaults.de;
  const state = facility.tags["addr:state"] || facility.tags["is_in:state"];
  // Regional holidays cannot be resolved reliably without the facility's state.
  if (/\b(?:PH|SH)\b/.test(hours) && !state) return false;
  const key = JSON.stringify([
    hours,
    facility.lat,
    facility.lon,
    countryCode,
    timezone,
    state,
  ]);
  try {
    if (!cache.has(key)) {
      if (cache.size >= 500) cache.delete(cache.keys().next().value!);
      try {
        cache.set(
          key,
          new OpeningHours(hours, {
            lat: facility.lat,
            lon: facility.lon,
            address: { country_code: countryCode, state: state || "" },
          }),
        );
      } catch {
        cache.set(key, null);
      }
    }
    const schedule = cache.get(key);
    return (
      !!schedule &&
      schedule.getState(localCalendarDate(at, timezone)) &&
      !schedule.getUnknown(localCalendarDate(at, timezone))
    );
  } catch {
    return false;
  }
}
