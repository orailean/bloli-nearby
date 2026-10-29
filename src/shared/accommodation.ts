import type { Facility, SourceRecord } from "./types.js";
import { ACCOMMODATION_TYPES, type AccommodationType } from "./nearby-types.js";
import { basePlace } from "./nearby-base.js";
import { safeHttpUrl } from "./kebab.js";
export function normalizeAccommodation(r: SourceRecord): Facility | null {
  const t = r.tags;
  if (!ACCOMMODATION_TYPES.includes(t.tourism as AccommodationType))
    return null;
  const base = basePlace(r);
  if (!base) return null;
  const text = (k: string) => t[k]?.trim() || null;
  return {
    ...base,
    category: "accommodation",
    website: safeHttpUrl(t.website || t["contact:website"]),
    accommodation: {
      type: t.tourism as AccommodationType,
      stars: text("stars"),
      rooms: text("rooms"),
      beds: text("beds"),
      receptionHours: text("opening_hours:reception"),
      checkIn: text("check_in"),
      checkOut: text("check_out"),
      internet: text("internet_access"),
      pets: text("pets"),
      phone: text("contact:phone") || text("phone"),
    },
  };
}
