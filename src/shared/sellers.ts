import type { Facility, SourceRecord } from "./types.js";
import { coordinates, AppError } from "./domain.js";
import type { SellerType } from "./sites.js";
const tokens = (value: string | undefined) =>
  (value || "")
    .toLowerCase()
    .split(";")
    .map((v) => v.trim());
export function normalizeSeller(r: SourceRecord): Facility | null {
  coordinates(r.lat, r.lon);
  if (
    !["node", "way", "relation"].includes(r.sourceType) ||
    !/^\d+$/.test(r.sourceId)
  )
    throw new AppError("INVALID_SOURCE");
  const t = r.tags;
  if (
    [
      "disused",
      "abandoned",
      "demolished",
      "removed",
      "razed",
      "construction",
    ].some((k) => t[k] === "yes") ||
    ["no", "vacant", "disused", "abandoned", "closed"].includes(t.shop) ||
    t.tobacco === "no" ||
    t["sells:tobacco"] === "no"
  )
    return null;
  if (
    t.type === "route" ||
    t.type === "route_master" ||
    t.type === "collection"
  )
    return null;
  if (
    t.access &&
    !["yes", "public", "permissive", "customers"].includes(t.access)
  )
    return null;
  if (t.locked === "yes" || t["access:conditional"]) return null;
  const positive =
    t.tobacco === "yes" ||
    tokens(t["sells:tobacco"]).some((value) =>
      ["yes", "tobacco", "cigarette", "cigarettes"].includes(value),
    );
  let sellerType: SellerType;
  if (
    t.amenity === "vending_machine" &&
    tokens(t.vending).includes("cigarettes")
  )
    sellerType = "machine";
  else if (t.amenity === "fuel") sellerType = "fuel";
  else if (t.shop && (t.shop === "tobacco" || positive)) sellerType = "shop";
  else return null;
  const names: Facility["names"] = {};
  for (const lang of ["en", "de", "ro"] as const)
    if (t[`name:${lang}`]) names[lang] = t[`name:${lang}`];
  return applySellerDefaults({
    id: `${r.sourceType}/${r.sourceId}`,
    sourceType: r.sourceType,
    sourceId: r.sourceId,
    lat: r.lat,
    lon: r.lon,
    name: t.name || null,
    names,
    category: "tobacco",
    sellerType,
    tobaccoSales: sellerType === "fuel" && !positive ? "unconfirmed" : "mapped",
    fee: "unknown",
    feeText: null,
    charge: null,
    access:
      t.access === "customers" ? "customers" : t.access ? "public" : "unknown",
    wheelchair: ["yes", "no", "limited"].includes(t.wheelchair)
      ? (t.wheelchair as Facility["wheelchair"])
      : "unknown",
    openingHours: t.opening_hours || null,
    operator: t.operator || null,
    brand: t.brand || null,
    notes: t.description || null,
    paymentMethods: Object.fromEntries(
      Object.entries(t)
        .filter(([key]) => key.startsWith("payment:"))
        .map(([key, value]) => [key.slice(8), value]),
    ),
    tags: t,
  });
}

export function applySellerDefaults(facility: Facility): Facility {
  if (facility.sellerType && !facility.tobaccoSales) {
    const tags = facility.tags;
    const positive =
      tags.tobacco === "yes" ||
      tokens(tags["sells:tobacco"]).some((value) =>
        ["yes", "tobacco", "cigarette", "cigarettes"].includes(value),
      );
    facility = {
      ...facility,
      tobaccoSales:
        facility.sellerType === "fuel" && !positive ? "unconfirmed" : "mapped",
    };
  }
  if (facility.sellerType === "machine" && !facility.openingHours?.trim())
    return { ...facility, openingHours: "24/7", hoursAssumed: true };
  return facility;
}
