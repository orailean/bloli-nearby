import type { Facility, SourceRecord } from "./types.js";
import { AppError, coordinates } from "./domain.js";
export function normalizeWater(r: SourceRecord): Facility | null {
  coordinates(r.lat, r.lon);
  if (
    !["node", "way", "relation"].includes(r.sourceType) ||
    !/^\d+$/.test(r.sourceId)
  )
    throw new AppError("INVALID_SOURCE");
  const t = r.tags;
  const refill = t["drinking_water:refill"] === "yes";
  const standalone =
    t.amenity === "drinking_water" ||
    (t.amenity === "fountain" && t.fountain === "drinking");
  if (!standalone && t.drinking_water !== "yes" && !refill) return null;
  if (
    (t.drinking_water && t.drinking_water !== "yes") ||
    t["drinking_water:legal"] === "no" ||
    ["route", "route_master", "collection"].includes(t.type) ||
    [
      "disused",
      "abandoned",
      "demolished",
      "removed",
      "razed",
      "construction",
    ].some(
      (k) =>
        t[k] === "yes" ||
        !!t[`${k}:amenity`] ||
        !!t[`${k}:drinking_water`] ||
        !!t[`${k}:shop`] ||
        !!t[`${k}:natural`] ||
        !!t[`${k}:man_made`] ||
        !!t[`${k}:drinking_water:refill`],
    ) ||
    (t.access &&
      ![
        "yes",
        "public",
        "permissive",
        ...(refill ? ["customers"] : []),
      ].includes(t.access)) ||
    t.locked === "yes" ||
    t.centralkey ||
    t["access:conditional"] ||
    t["drinking_water:access:conditional"] ||
    t["drinking_water:locked"] === "yes" ||
    t["drinking_water:centralkey"]
  )
    return null;
  const waterAccess = t["drinking_water:access"];
  if (
    waterAccess &&
    !["yes", "public", "permissive", ...(refill ? ["customers"] : [])].includes(
      waterAccess,
    )
  )
    return null;
  const feeText =
    t["drinking_water:fee"] || (standalone ? t.fee : null) || null;
  const conditional =
    t["drinking_water:fee:conditional"] ||
    (standalone ? t["fee:conditional"] : null);
  const names: Facility["names"] = {};
  for (const lang of ["de", "en", "ro", "hu"] as const)
    if (t[`name:${lang}`]) names[lang] = t[`name:${lang}`];
  return {
    id: `${r.sourceType}/${r.sourceId}`,
    sourceType: r.sourceType,
    sourceId: r.sourceId,
    lat: r.lat,
    lon: r.lon,
    name: t.name || null,
    names,
    category: "water",
    waterType: refill ? "refill" : "point",
    bottle: t.bottle || null,
    seasonal: t.seasonal || null,
    refillNetwork: t["drinking_water:refill:network"] || null,
    fee: conditional
      ? "unknown"
      : feeText === "no"
        ? "free"
        : feeText === "yes"
          ? "paid"
          : "unknown",
    feeText: conditional ? `${feeText || ""} (${conditional})` : feeText,
    charge:
      t["drinking_water:charge"] || (standalone ? t.charge : null) || null,
    access: [t.access, waterAccess].includes("customers")
      ? "customers"
      : waterAccess || t.access
        ? "public"
        : "unknown",
    wheelchair: ["yes", "no", "limited"].includes(t.wheelchair)
      ? (t.wheelchair as Facility["wheelchair"])
      : "unknown",
    openingHours:
      t["opening_hours:drinking_water"]?.trim() ||
      t.opening_hours?.trim() ||
      null,
    operator: t.operator || null,
    notes: t.description || null,
    tags: t,
  };
}
