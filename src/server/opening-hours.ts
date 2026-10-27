import OpeningHours from "opening_hours";
import type { Facility } from "../shared/types.js";
// All supported locations are in Germany; the parser uses native Date getters.
// Set this explicitly for both native debugging and UTC-based containers.
process.env.TZ = "Europe/Berlin";
const cache = new Map<string, OpeningHours | null>();
export function isOpenNow(
  facility: Pick<
    Facility,
    "openingHours" | "lat" | "lon" | "tags" | "category"
  >,
  at = new Date(),
): boolean {
  const hours = facility.openingHours?.trim();
  if (!hours) return false;
  if (
    facility.category === "water" &&
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
  const state = facility.tags["addr:state"] || facility.tags["is_in:state"];
  // Regional holidays cannot be resolved reliably without the facility's state.
  if (/\b(?:PH|SH)\b/.test(hours) && !state) return false;
  const key = JSON.stringify([hours, facility.lat, facility.lon, state]);
  try {
    if (!cache.has(key)) {
      if (cache.size >= 500) cache.delete(cache.keys().next().value!);
      try {
        cache.set(
          key,
          new OpeningHours(hours, {
            lat: facility.lat,
            lon: facility.lon,
            address: { country_code: "de", state: state || "" },
          }),
        );
      } catch {
        cache.set(key, null);
      }
    }
    const schedule = cache.get(key);
    return !!schedule && schedule.getState(at) && !schedule.getUnknown(at);
  } catch {
    return false;
  }
}
