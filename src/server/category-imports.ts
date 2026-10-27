import type { Category } from "../shared/sites.js";
import type { Facility, SourceRecord } from "../shared/types.js";
import { normalizeFacility } from "../shared/domain.js";
import { normalizeSeller } from "../shared/sellers.js";
import { normalizeKebab } from "../shared/kebab.js";
import { normalizeWater } from "../shared/water.js";
export type CategoryMinimum =
  | "minimumFacilities"
  | "minimumSellers"
  | "minimumKebabs"
  | "minimumWaterPoints";
export interface CategoryImport {
  kind: string;
  minimum: CategoryMinimum;
  defaultMinimum: number;
  count: "facilities" | "sellers" | "kebabs" | "waterPoints";
  normalize: (record: SourceRecord) => Facility | null;
}
export const categoryImports: Record<Category, CategoryImport> = {
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
