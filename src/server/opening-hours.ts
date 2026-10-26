import OpeningHours from "opening_hours";
import type { Facility } from "../shared/types.js";
// All supported locations are in Germany; the parser uses native Date getters.
// Set this explicitly for both native debugging and UTC-based containers.
process.env.TZ = "Europe/Berlin";
const cache = new Map<string, OpeningHours | null>();
export function isOpenNow(
  facility: Pick<Facility, "openingHours" | "lat" | "lon" | "tags">,
  at = new Date(),
): boolean {
  const hours = facility.openingHours?.trim();
  if (!hours) return false;
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
