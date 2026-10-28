import type { Facility, SourceRecord } from "./types.js";
import type { ChargingConnector } from "./charge-types.js";
import { coordinates, AppError } from "./domain.js";
import { safeHttpUrl } from "./kebab.js";
// Explicit connector evidence only; brand names and socket subkeys do not qualify.
export const CAR_CONNECTORS: Record<string, ChargingConnector["type"]> = {
  type2_combo: "ccs",
  ccs: "ccs",
  tesla_supercharger_ccs: "ccs",
  type2_combo_cable: "ccs",
  type2: "type2",
  type2_cable: "type2",
  chademo: "chademo",
  type1: "other",
  type1_cable: "other",
  type1_combo: "other",
  nacs: "other",
  tesla_supercharger: "other",
  tesla_destination: "other",
  tesla_standard: "other",
};
export function parseChargePower(raw: string): number | null {
  const m = raw.trim().match(/^(\d+(?:[.,]\d+)?)\s*(W|kW|MW)?$/i);
  if (!m) return null;
  const scale =
    m[2]?.toLowerCase() === "w"
      ? 0.001
      : m[2]?.toLowerCase() === "mw"
        ? 1000
        : 1;
  const n = Number(m[1].replace(",", ".")) * scale;
  return Number.isFinite(n) && n > 0 ? n : null;
}
const count = (raw: string | undefined) =>
  raw && /^[1-9]\d*$/.test(raw) && Number.isSafeInteger(Number(raw))
    ? Number(raw)
    : null;
export function normalizeCharge(r: SourceRecord): Facility | null {
  coordinates(r.lat, r.lon);
  if (
    !["node", "way", "relation"].includes(r.sourceType) ||
    !/^\d+$/.test(r.sourceId)
  )
    throw new AppError("INVALID_SOURCE");
  const t = r.tags;
  if (
    t.amenity !== "charging_station" ||
    ["route", "route_master", "collection", "destination_sign"].includes(
      t.type,
    ) ||
    ["stop_area", "stop_area_group"].includes(t.public_transport)
  )
    return null;
  const inactive = [
    "disused",
    "abandoned",
    "demolished",
    "removed",
    "razed",
    "construction",
    "proposed",
  ];
  if (
    inactive.some(
      (k) => t[k] === "yes" || !!t[`${k}:amenity`] || t.amenity === k,
    ) ||
    t.construction ||
    t["construction:amenity"] ||
    t.locked === "yes" ||
    t.centralkey
  )
    return null;
  const accessValues = [
    "yes",
    "designated",
    "public",
    "permissive",
    "customers",
    "destination",
  ];
  for (const key of ["access", "motor_vehicle", "motorcar"])
    if (t[`${key}:conditional`] || (t[key] && !accessValues.includes(t[key])))
      return null;
  const connectors: ChargingConnector[] = Object.entries(
    CAR_CONNECTORS,
  ).flatMap(([key, type]) => {
    const raw = t[`socket:${key}`];
    if (raw !== "yes" && count(raw) === null) return [];
    const rawOutput = t[`socket:${key}:output`] || null;
    return [
      {
        key,
        type,
        count: count(raw),
        rawOutput,
        outputKw:
          rawOutput &&
          !t[`socket:${key}:output:conditional`] &&
          !t[`socket:${key}:conditional`]
            ? parseChargePower(rawOutput)
            : null,
      },
    ];
  });
  // Marked two-wheel/device charging needs positive car evidence to remain eligible.
  const carPermission = [
    "yes",
    "designated",
    "public",
    "permissive",
    "customers",
    "destination",
  ].includes(t.motorcar || "");
  if (
    !carPermission &&
    !connectors.length &&
    ["bicycle", "scooter", "motorcycle"].some((k) =>
      ["yes", "designated"].includes(t[k]),
    )
  )
    return null;
  const restricted =
    ["access", "motor_vehicle", "motorcar"]
      .map((k) => t[k])
      .find((v) => v === "customers" || v === "destination") || null;
  const access = restricted
    ? "customers"
    : ["yes", "public", "permissive", "designated"].includes(t.access || "")
      ? "public"
      : "unknown";
  const names: Facility["names"] = {};
  for (const lang of ["de", "en", "ro"] as const)
    if (t[`name:${lang}`]) names[lang] = t[`name:${lang}`];
  const conditionalFee = t["fee:conditional"];
  const prefixed = (prefix: string) =>
    Object.fromEntries(
      Object.entries(t)
        .filter(([k]) => k.startsWith(prefix))
        .map(([k, v]) => [k.slice(prefix.length), v]),
    );
  return {
    id: `${r.sourceType}/${r.sourceId}`,
    sourceType: r.sourceType,
    sourceId: r.sourceId,
    lat: r.lat,
    lon: r.lon,
    name: t.name || null,
    names,
    category: "charge",
    access,
    fee: conditionalFee
      ? "unknown"
      : t.fee === "no"
        ? "free"
        : t.fee === "yes"
          ? "paid"
          : "unknown",
    feeText: conditionalFee
      ? `${t.fee || ""} (${conditionalFee})`
      : t.fee || null,
    charge: t.charge || null,
    wheelchair: ["yes", "no", "limited"].includes(t.wheelchair)
      ? (t.wheelchair as Facility["wheelchair"])
      : "unknown",
    openingHours: t["opening_hours:conditional"]
      ? null
      : t.opening_hours?.trim() || null,
    operator: t.operator || null,
    brand: t.brand || null,
    notes: t.description || null,
    tags: t,
    paymentMethods: prefixed("payment:"),
    website: safeHttpUrl(t.website || t["contact:website"]),
    charging: {
      connectors,
      accessRestriction: restricted,
      network: t.network || null,
      capacity: count(t.capacity),
      parkingFee: t["parking:fee"] || null,
      authenticationMethods: prefixed("authentication:"),
    },
  };
}
