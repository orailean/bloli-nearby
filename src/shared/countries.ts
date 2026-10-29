import type { Category } from "./sites.js";

export type CountryCode = "de" | "ro" | "at" | "hu";
export type CountryStatus = "active" | "pending";

export interface CountryProfile {
  code: CountryCode;
  name: string;
  timezone: string;
  sourceUrl: string;
  boundaryUrl: string;
  storagePath: string;
  rolloutOrder: number;
  initialStatus: CountryStatus;
}

const geofabrik = "https://download.geofabrik.de/europe";

export const COUNTRIES: readonly CountryProfile[] = [
  {
    code: "de",
    name: "Germany",
    timezone: "Europe/Berlin",
    sourceUrl: `${geofabrik}/germany-latest.osm.pbf`,
    boundaryUrl: `${geofabrik}/germany.poly`,
    storagePath: "/data/countries/de",
    rolloutOrder: 0,
    initialStatus: "active",
  },
  {
    code: "ro",
    name: "Romania",
    timezone: "Europe/Bucharest",
    sourceUrl: `${geofabrik}/romania-latest.osm.pbf`,
    boundaryUrl: `${geofabrik}/romania.poly`,
    storagePath: "/data/countries/ro",
    rolloutOrder: 1,
    initialStatus: "pending",
  },
  {
    code: "at",
    name: "Austria",
    timezone: "Europe/Vienna",
    sourceUrl: `${geofabrik}/austria-latest.osm.pbf`,
    boundaryUrl: `${geofabrik}/austria.poly`,
    storagePath: "/data/countries/at",
    rolloutOrder: 2,
    initialStatus: "pending",
  },
  {
    code: "hu",
    name: "Hungary",
    timezone: "Europe/Budapest",
    sourceUrl: `${geofabrik}/hungary-latest.osm.pbf`,
    boundaryUrl: `${geofabrik}/hungary.poly`,
    storagePath: "/data/countries/hu",
    rolloutOrder: 3,
    initialStatus: "pending",
  },
];

const floorVariable: Record<Category, string> = {
  atm: "ATMS",
  accommodation: "ACCOMMODATIONS",
  toilets: "TOILETS",
  tobacco: "SELLERS",
  kebab: "KEBABS",
  water: "WATER_POINTS",
  transit: "TRANSIT_STOPS",
  charge: "CHARGE_STATIONS",
};
const legacyGermanyVariables: Partial<Record<Category, string>> = {
  toilets: "MIN_FACILITIES",
  tobacco: "MIN_SELLERS",
  kebab: "MIN_KEBABS",
  water: "MIN_WATER_POINTS",
  transit: "MIN_TRANSIT_STOPS",
  charge: "MIN_CHARGE_STATIONS",
};

export function minimumForCountry(
  country: CountryCode,
  category: Category,
  env: NodeJS.ProcessEnv = process.env,
): number | undefined {
  const specific =
    env[`MIN_${country.toUpperCase()}_${floorVariable[category]}`];
  const configured =
    specific ??
    (country === "de" ? env[legacyGermanyVariables[category]!] : undefined);
  if (configured === undefined || !/^\d+$/.test(configured)) return undefined;
  const minimum = Number(configured);
  return Number.isSafeInteger(minimum) && minimum > 0 ? minimum : undefined;
}

export function minimumSettlementsForCountry(
  country: CountryCode,
  env: NodeJS.ProcessEnv = process.env,
): number | undefined {
  const value =
    env[`MIN_${country.toUpperCase()}_SETTLEMENTS`] ??
    (country === "de" ? env.MIN_SETTLEMENTS : undefined);
  if (value === undefined || !/^\d+$/.test(value)) return undefined;
  const minimum = Number(value);
  return Number.isSafeInteger(minimum) && minimum > 0 ? minimum : undefined;
}
