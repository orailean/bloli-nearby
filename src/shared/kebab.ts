import type { Facility, SourceRecord } from "./types.js";
import { AppError, coordinates } from "./domain.js";
const cuisineTokens = (value: string) =>
  value
    .toLowerCase()
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean);
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function normalizeKebab(r: SourceRecord): Facility | null {
  coordinates(r.lat, r.lon);
  if (
    !["node", "way", "relation"].includes(r.sourceType) ||
    !/^\d+$/.test(r.sourceId)
  )
    throw new AppError("INVALID_SOURCE");
  const t = r.tags;
  const cuisine = cuisineTokens(t.cuisine || "");
  if (
    !["restaurant", "fast_food"].includes(t.amenity) ||
    !cuisine.some((x) => ["kebab", "doner", "doener", "döner"].includes(x))
  )
    return null;
  if (
    ["route", "route_master", "collection"].includes(t.type) ||
    [
      "disused",
      "abandoned",
      "demolished",
      "removed",
      "razed",
      "construction",
    ].some((k) => t[k] === "yes" || !!t[`${k}:amenity`]) ||
    (t.access &&
      !["yes", "public", "permissive", "customers"].includes(t.access)) ||
    t.locked === "yes" ||
    t["access:conditional"]
  )
    return null;
  const names: Facility["names"] = {};
  for (const lang of ["en", "de", "ro"] as const)
    if (t[`name:${lang}`]) names[lang] = t[`name:${lang}`];
  return {
    id: `${r.sourceType}/${r.sourceId}`,
    sourceType: r.sourceType,
    sourceId: r.sourceId,
    lat: r.lat,
    lon: r.lon,
    name: t.name || null,
    names,
    category: "kebab",
    cuisine,
    fee: "unknown",
    feeText: null,
    charge: null,
    access:
      t.access === "customers" ? "customers" : t.access ? "public" : "unknown",
    wheelchair: ["yes", "no", "limited"].includes(t.wheelchair)
      ? (t.wheelchair as Facility["wheelchair"])
      : "unknown",
    openingHours: t.opening_hours?.trim() || null,
    operator: t.operator || null,
    brand: t.brand || null,
    notes: t.description || null,
    tags: t,
    takeaway: t.takeaway || null,
    delivery: t.delivery || null,
    dietary: Object.fromEntries(
      ["halal", "vegan", "vegetarian", "kosher", "gluten_free"]
        .filter((k) => !!t[`diet:${k}`])
        .map((k) => [k, t[`diet:${k}`]]),
    ),
    website: safeHttpUrl(t.website || t["contact:website"]),
    menuUrl: safeHttpUrl(t["website:menu"] || t.menu),
    paymentMethods: Object.fromEntries(
      Object.entries(t)
        .filter(([k]) => k.startsWith("payment:"))
        .map(([k, v]) => [k.slice(8), v]),
    ),
  };
}
