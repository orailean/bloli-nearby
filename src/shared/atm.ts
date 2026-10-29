import type { Facility, SourceRecord } from "./types.js";
import { basePlace } from "./nearby-base.js";
export function normalizeAtm(r: SourceRecord): Facility | null {
  const t = r.tags,
    standalone = t.amenity === "atm";
  if (!standalone && t.atm !== "yes") return null;
  const base = basePlace(r);
  if (!base) return null;
  const get = (key: string) =>
    (standalone ? t[key] : t[`atm:${key}`])?.trim() || null;
  const access = get("access");
  if (
    access &&
    !["yes", "public", "permissive", "customers", "designated"].includes(access)
  )
    return null;
  if (
    get("cash_withdrawal") === "no" ||
    get("cash_out") === "no" ||
    get("locked") === "yes" ||
    get("access:conditional") ||
    get("centralkey")
  )
    return null;
  const rawFee = get("fee"),
    conditional = get("fee:conditional");
  const deposit = get("cash_in") || get("cash_deposit");
  const currency = get("currency") || get("currencies") || "";
  const currencies = [
    ...new Set([
      ...currency
        .toUpperCase()
        .split(/[;,\s]+/)
        .filter((v) => /^[A-Z]{3}$/.test(v)),
      ...Object.entries(t)
        .filter(
          ([k, v]) =>
            k.startsWith(standalone ? "currency:" : "atm:currency:") &&
            v === "yes",
        )
        .map(([k]) => k.split(":").at(-1)!)
        .filter((v) => /^[A-Z]{3}$/.test(v)),
    ]),
  ];
  return {
    ...base,
    category: "atm",
    operator: get("operator"),
    openingHours: get("opening_hours:conditional") || (!standalone && t['opening_hours:atm:conditional'])
      ? null
      : (!standalone ? t['opening_hours:atm']?.trim() : null) || get("opening_hours") || (!standalone ? base.openingHours : null),
    access:
      access === "customers" || base.access === "customers"
        ? "customers"
        : access
          ? "public"
          : base.access,
    wheelchair: ["yes", "no", "limited"].includes(get("wheelchair") || "")
      ? (get("wheelchair") as Facility["wheelchair"])
      : base.wheelchair,
    fee: conditional
      ? "unknown"
      : rawFee === "no"
        ? "free"
        : rawFee === "yes"
          ? "paid"
          : "unknown",
    feeText: conditional ? `${rawFee || ""} (${conditional})` : rawFee,
    charge: get("charge"),
    atm: {
      embedded: !standalone,
      currencies,
      deposit: deposit === "yes" ? "yes" : deposit === "no" ? "no" : "unknown",
      withdrawal:
        get("cash_withdrawal") === "yes" || get("cash_out") === "yes"
          ? "yes"
          : "unknown",
      network: get("network"),
    },
  };
}
