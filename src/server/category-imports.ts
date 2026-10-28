import { normalizeCharge } from "../shared/charge.js";
import type { Category } from "../shared/sites.js";
import type { Facility, SourceRecord } from "../shared/types.js";
import { normalizeFacility } from "../shared/domain.js";
import { normalizeSeller } from "../shared/sellers.js";
import { normalizeKebab } from "../shared/kebab.js";
import { normalizeWater } from "../shared/water.js";
import { normalizeTransit } from "../shared/transit.js";
export type CategoryMinimum =
  | "minimumFacilities"
  | "minimumSellers"
  | "minimumKebabs"
  | "minimumWaterPoints"
  | "minimumTransit"
  | "minimumChargeStations";
export interface CategoryImport {
  kind: string;
  minimum: CategoryMinimum;
  defaultMinimum: number;
  count:
    | "facilities"
    | "sellers"
    | "kebabs"
    | "waterPoints"
    | "transitStops"
    | "chargeStations";
  normalize: (record: SourceRecord) => Facility | null;
}
export const categoryImports: Record<Category, CategoryImport> = {
  charge: {
    kind: "charge",
    minimum: "minimumChargeStations",
    defaultMinimum: 100,
    count: "chargeStations",
    normalize: normalizeCharge,
  },
  transit: {
    kind: "transit",
    minimum: "minimumTransit",
    defaultMinimum: 1000,
    count: "transitStops",
    normalize: normalizeTransit,
  },
  water: {
    kind: "water",
    minimum: "minimumWaterPoints",
    defaultMinimum: 100,
    count: "waterPoints",
    normalize: normalizeWater,
  },
  toilets: {
    kind: "facility",
    minimum: "minimumFacilities",
    defaultMinimum: 1000,
    count: "facilities",
    normalize: normalizeFacility,
  },
  tobacco: {
    kind: "seller",
    minimum: "minimumSellers",
    defaultMinimum: 100,
    count: "sellers",
    normalize: normalizeSeller,
  },
  kebab: {
    kind: "kebab",
    minimum: "minimumKebabs",
    defaultMinimum: 100,
    count: "kebabs",
    normalize: normalizeKebab,
  },
};
