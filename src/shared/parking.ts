import { coordinates, AppError } from "./domain.js";
import { basePlace } from "./nearby-base.js";
import type { Facility, SourceRecord } from "./types.js";
import type { ParkingType } from "./parking-types.js";
export function normalizeParking(record: SourceRecord): Facility | null {
  const t = record.tags;
  if (
    t.amenity !== "parking" ||
    [
      "disused",
      "abandoned",
      "demolished",
      "removed",
      "razed",
      "construction",
      "proposed",
    ].some((k) => Boolean(t[`${k}:parking`]))
  )
    return null;
  for (const key of ["vehicle", "motor_vehicle", "motorcar"]) {
    if (
      t[`${key}:conditional`] ||
      (t[key] &&
        !["yes", "public", "permissive", "customers", "designated"].includes(
          t[key],
        ))
    )
      return null;
  }
  if (record.parkingEntrance) {
    const e = record.parkingEntrance;
    coordinates(e.lat, e.lon);
    if (
      !["node", "way", "relation"].includes(e.sourceType) ||
      !/^\d+$/.test(e.sourceId)
    )
      throw new AppError("INVALID_SOURCE");
  }
  const base = basePlace(record);
  if (!base) return null;
  const effectiveAccess =
    t.motorcar || t.motor_vehicle || t.vehicle || t.access;
  const access: Facility["access"] =
    effectiveAccess === "customers"
      ? "customers"
      : effectiveAccess
        ? "public"
        : "unknown";
  const text = (k: string) => t[k]?.trim() || null;
  const count = (k: string) => {
    const v = text(k);
    if (!v || !/^\d+$/.test(v)) return null;
    const n = Number(v);
    return Number.isSafeInteger(n) ? n : null;
  };
  const flag = (k: string): boolean | null =>
    t[`${k}:conditional`]
      ? null
      : t[k] === "yes"
        ? true
        : t[k] === "no"
          ? false
          : null;
  // Missing OSM parking type remains unknown; surface is never inferred.
  const type: ParkingType = !text("parking")
    ? "unknown"
    : ["surface", "underground", "multi-storey"].includes(t.parking)
      ? (t.parking as ParkingType)
      : "other";
  const conditional = text("fee:conditional");
  return {
    ...base,
    access,
    category: "parking",
    fee: conditional
      ? "unknown"
      : t.fee === "yes"
        ? "paid"
        : t.fee === "no"
          ? "free"
          : "unknown",
    feeText: conditional
      ? `${text("fee") || ""} (${conditional})`.trim()
      : text("fee"),
    charge: text("charge"),
    parking: {
      type,
      capacity: count("capacity"),
      disabledCapacity: count("capacity:disabled"),
      maxstay: text("maxstay"),
      maxheight: text("maxheight"),
      surface: text("surface"),
      parkRide: t["park_ride:conditional"]
        ? null
        : [
              "yes",
              "bus",
              "train",
              "tram",
              "metro",
              "railway",
              "subway",
              "ferry",
            ].includes(t.park_ride)
          ? true
          : flag("park_ride"),
      hiking: flag("hiking"),
      entrance: record.parkingEntrance ?? null,
    },
  };
}
