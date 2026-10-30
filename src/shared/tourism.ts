import { basePlace } from "./nearby-base.js";
import { safeHttpUrl } from "./kebab.js";
import type { Facility, SourceRecord } from "./types.js";
import type { TouristData } from "./tourism-types.js";
const historicTypes = [
  "castle",
  "ruins",
  "monument",
  "memorial",
  "archaeological_site",
] as const;
function touristPlace(
  record: SourceRecord,
  category: "view" | "sights",
  type: TouristData["type"],
): Facility | null {
  const base = basePlace(record);
  const t = record.tags;
  if (
    !base ||
    ![
      "",
      "multipolygon",
      "boundary",
      "site",
      "building",
      "bridge",
      "artwork",
      "multilinestring",
    ].includes(t.type || "") ||
    [
      "disused",
      "abandoned",
      "demolished",
      "removed",
      "razed",
      "construction",
      "proposed",
    ].some(
      (key) => Boolean(t[`${key}:historic`]) || Boolean(t[`${key}:man_made`]),
    )
  )
    return null;
  const text = (key: string) => t[key]?.trim() || null;
  const conditional = text("fee:conditional");
  const feeText = text("fee");
  return {
    ...base,
    category,
    fee: conditional
      ? "unknown"
      : feeText === "no"
        ? "free"
        : feeText === "yes"
          ? "paid"
          : "unknown",
    feeText: conditional ? `${feeText || ""} (${conditional})`.trim() : feeText,
    charge: text("charge"),
    website: safeHttpUrl(t.website || t["contact:website"]),
    tourist: {
      type,
      elevation: text("ele"),
      height: text("height"),
      direction: text("direction"),
      phone: text("contact:phone") || text("phone"),
    },
  };
}
export function normalizeView(record: SourceRecord): Facility | null {
  const t = record.tags;
  const tower = t.man_made === "tower" && t["tower:type"] === "observation";
  if (!tower && t.tourism !== "viewpoint") return null;
  return touristPlace(record, "view", tower ? "tower" : "viewpoint");
}
export function normalizeSights(record: SourceRecord): Facility | null {
  const t = record.tags;
  const historic = historicTypes.find((type) => type === t.historic);
  const type =
    historic ||
    (t.tourism === "museum" || t.tourism === "attraction" ? t.tourism : null);
  return type ? touristPlace(record, "sights", type) : null;
}
