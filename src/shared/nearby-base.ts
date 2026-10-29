import type { Facility, SourceRecord } from "./types.js";
import { AppError, coordinates } from "./domain.js";
export function basePlace(r: SourceRecord): Facility | null {
  coordinates(r.lat, r.lon);
  if (
    !["node", "way", "relation"].includes(r.sourceType) ||
    !/^\d+$/.test(r.sourceId)
  )
    throw new AppError("INVALID_SOURCE");
  const t = r.tags;
  if (
    ["route", "route_master", "collection", "destination_sign"].includes(
      t.type,
    ) ||
    [
      "disused",
      "abandoned",
      "demolished",
      "removed",
      "razed",
      "construction",
      "proposed",
    ].some(
      (k) =>
        t[k] === "yes" ||
        Boolean(t[`${k}:amenity`]) ||
        Boolean(t[`${k}:tourism`]) ||
        Boolean(t[`${k}:atm`]),
    ) ||
    Boolean(t.construction) ||
    t.locked === "yes" ||
    Boolean(t.centralkey) ||
    Boolean(t["access:conditional"]) ||
    (t.access &&
      !["yes", "public", "permissive", "customers", "designated"].includes(
        t.access,
      ))
  )
    return null;
  return {
    id: `${r.sourceType}/${r.sourceId}`,
    sourceType: r.sourceType,
    sourceId: r.sourceId,
    lat: r.lat,
    lon: r.lon,
    name: t.name || null,
    names: Object.fromEntries(
      ["en", "de", "ro", "hu"]
        .filter((l) => t[`name:${l}`])
        .map((l) => [l, t[`name:${l}`]]),
    ),
    fee: "unknown",
    feeText: null,
    charge: null,
    access:
      t.access === "customers" ? "customers" : t.access ? "public" : "unknown",
    wheelchair: ["yes", "no", "limited"].includes(t.wheelchair)
      ? (t.wheelchair as Facility["wheelchair"])
      : "unknown",
    openingHours: t["opening_hours:conditional"]
      ? null
      : t.opening_hours?.trim() || null,
    operator: t.operator || null,
    notes: t.description || null,
    tags: t,
  };
}
