import { VIEW_TYPES, SIGHT_TYPES } from "./tourism-types.js";
import { ACCOMMODATION_TYPES } from "./nearby-types.js";
import { CHARGE_CONNECTORS, CHARGE_POWERS } from "./charge-types.js";
import { TRANSIT_MODES } from "./transit-modes.js";
import type { Category } from "./sites.js";
import type { Facility, SourceRecord, SearchQuery } from "./types.js";
export class AppError extends Error {
  constructor(
    public code: string,
    public status = 400,
  ) {
    super(code);
  }
}
export function coordinates(lat: number, lon: number) {
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    Math.abs(lat) > 90 ||
    Math.abs(lon) > 180
  )
    throw new AppError("INVALID_QUERY");
}
export function normalizeFacility(r: SourceRecord): Facility | null {
  coordinates(r.lat, r.lon);
  if (
    !["node", "way", "relation"].includes(r.sourceType) ||
    !/^\d+$/.test(r.sourceId)
  )
    throw new AppError("INVALID_SOURCE");
  const t = r.tags,
    standalone = t.amenity === "toilets";
  const get = (key: string) =>
    (standalone ? t[key] : t[`toilets:${key}`])?.trim() || null;
  const access = get("access");
  if (
    !standalone &&
    (t.toilets !== "yes" ||
      !["yes", "public", "permissive"].includes(access || ""))
  )
    return null;
  if (access && !["yes", "public", "permissive"].includes(access)) return null;
  if (get("centralkey") || get("locked") === "yes" || get("access:conditional"))
    return null;
  const feeText = get("fee"),
    conditional = get("fee:conditional");
  const fee = conditional
    ? "unknown"
    : feeText === "no"
      ? "free"
      : feeText === "yes"
        ? "paid"
        : "unknown";
  const wheelchair = get("wheelchair") || t.wheelchair;
  const names: Facility["names"] = {};
  for (const lang of ["en", "de", "ro", "hu"] as const)
    if (t[`name:${lang}`]) names[lang] = t[`name:${lang}`];
  return {
    id: `${r.sourceType}/${r.sourceId}`,
    sourceType: r.sourceType,
    sourceId: r.sourceId,
    lat: r.lat,
    lon: r.lon,
    name: t.name || null,
    names,
    fee,
    feeText: conditional ? `${feeText || ""} (${conditional})` : feeText,
    charge: get("charge"),
    access: access ? "public" : "unknown",
    wheelchair: ["yes", "no", "limited"].includes(wheelchair || "")
      ? (wheelchair as Facility["wheelchair"])
      : "unknown",
    openingHours: get("opening_hours"),
    operator: t.operator || null,
    notes: get("description") || t.description || null,
    tags: t,
  };
}
export const SEARCH_RADII = [500, 1000, 2000, 3000, 5000] as const;

export function parseSearch(
  p: URLSearchParams,
  category: Category = "toilets",
): SearchQuery {
  const number = (key: string, fallback?: number) => {
    const raw = p.get(key);
    if (raw === null && fallback !== undefined) return fallback;
    if (raw === null || raw.trim() === "" || p.getAll(key).length !== 1)
      throw new AppError("INVALID_QUERY");
    const n = Number(raw);
    if (!Number.isFinite(n)) throw new AppError("INVALID_QUERY");
    return n;
  };
  const lat = number("lat"),
    lon = number("lon"),
    radius = number("radius", SEARCH_RADII[0]),
    limit = number("limit", 100);
  coordinates(lat, lon);
  if (
    p.has("category") &&
    (p.get("category") !== category || p.getAll("category").length !== 1)
  )
    throw new AppError("INVALID_QUERY");
  if (
    (!["toilets", "water", "charge", "atm", "view", "sights"].includes(
      category,
    ) &&
      p.has("fee")) ||
    (category !== "tobacco" && p.has("sellerType"))
  )
    throw new AppError("INVALID_QUERY");
  if (
    (category !== "transit" && p.has("mode")) ||
    (["transit", "accommodation"].includes(category) && p.has("openNow"))
  )
    throw new AppError("INVALID_QUERY");
  const mode = p.get("mode") ?? "all";
  if (!["all", ...TRANSIT_MODES].includes(mode) || p.getAll("mode").length > 1)
    throw new AppError("INVALID_QUERY");
  const chargeKeys = ["connector", "minPowerKw", "chargeAccess"];
  if (category !== "charge" && chargeKeys.some((k) => p.has(k)))
    throw new AppError("INVALID_QUERY");
  const connector = p.get("connector") ?? "all",
    chargeAccess = p.get("chargeAccess") ?? "all";
  const minPowerKw = number("minPowerKw", 0);
  if (
    !CHARGE_CONNECTORS.includes(connector as never) ||
    !CHARGE_POWERS.includes(minPowerKw as never) ||
    !["all", "public", "customers"].includes(chargeAccess) ||
    chargeKeys.some((k) => p.getAll(k).length > 1)
  )
    throw new AppError("INVALID_QUERY");
  const currency = p.get("currency") ?? "all",
    deposit = p.get("deposit") ?? "all",
    accommodationType = p.get("accommodationType") ?? "all";
  if (
    (category !== "atm" && ["currency", "deposit"].some((k) => p.has(k))) ||
    (category !== "accommodation" && p.has("accommodationType")) ||
    (currency !== "all" && !/^[A-Z]{3}$/.test(currency)) ||
    !["all", "yes"].includes(deposit) ||
    !["all", ...ACCOMMODATION_TYPES].includes(accommodationType as never) ||
    ["currency", "deposit", "accommodationType"].some(
      (k) => p.getAll(k).length > 1,
    )
  )
    throw new AppError("INVALID_QUERY");
  const viewType = p.get("viewType") ?? "all",
    sightType = p.get("sightType") ?? "all";
  if (
    (category !== "view" && p.has("viewType")) ||
    (category !== "sights" && p.has("sightType")) ||
    !["all", ...VIEW_TYPES].includes(viewType) ||
    !["all", ...SIGHT_TYPES].includes(sightType) ||
    p.getAll("viewType").length > 1 ||
    p.getAll("sightType").length > 1
  )
    throw new AppError("INVALID_QUERY");
  const sellerType = p.get("sellerType") ?? "all";
  if (
    !["all", "machine", "shop", "fuel"].includes(sellerType) ||
    p.getAll("sellerType").length > 1
  )
    throw new AppError("INVALID_QUERY");
  const fee = p.get("fee") ?? "all";
  const openNow = p.get("openNow") ?? "false";
  if (
    radius < 1 ||
    radius > SEARCH_RADII[SEARCH_RADII.length - 1] ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    !(
      category === "atm"
        ? ["all", "free", "paid", "unknown"]
        : ["all", "free", "paid"]
    ).includes(fee) ||
    p.getAll("fee").length > 1 ||
    !["true", "false"].includes(openNow) ||
    p.getAll("openNow").length > 1
  )
    throw new AppError("INVALID_QUERY");
  return {
    ...(category === "view"
      ? { viewType: viewType as SearchQuery["viewType"] }
      : {}),
    ...(category === "sights"
      ? { sightType: sightType as SearchQuery["sightType"] }
      : {}),
    ...(category === "atm"
      ? { currency, deposit: deposit as SearchQuery["deposit"] }
      : {}),
    ...(category === "accommodation"
      ? {
          accommodationType:
            accommodationType as SearchQuery["accommodationType"],
        }
      : {}),
    ...(category === "transit" ? { mode: mode as SearchQuery["mode"] } : {}),
    ...(category === "charge"
      ? {
          connector: connector as SearchQuery["connector"],
          minPowerKw: minPowerKw as SearchQuery["minPowerKw"],
          chargeAccess: chargeAccess as SearchQuery["chargeAccess"],
        }
      : {}),
    lat,
    lon,
    radius,
    limit,
    fee: fee as SearchQuery["fee"],
    openNow: openNow === "true",
    ...(category === "tobacco"
      ? { sellerType: sellerType as SearchQuery["sellerType"] }
      : {}),
  };
}
export function directionsUrl(
  lat: number,
  lon: number,
  mode: "walking" | "driving" = "walking",
): string {
  coordinates(lat, lon);
  return `https://www.google.com/maps/dir/?${new URLSearchParams({ api: "1", destination: `${lat},${lon}`, travelmode: mode })}`;
}
