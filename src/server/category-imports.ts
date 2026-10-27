import type { Category } from "../shared/sites.js";
import type { Facility, SourceRecord } from "../shared/types.js";
import { normalizeFacility } from "../shared/domain.js";
import { normalizeSeller } from "../shared/sellers.js";
import { normalizeKebab } from "../shared/kebab.js";
export type CategoryMinimum =
  | "minimumFacilities"
  | "minimumSellers"
  | "minimumKebabs";
export interface CategoryImport {
  kind: string;
  minimum: CategoryMinimum;
  defaultMinimum: number;
  count: "facilities" | "sellers" | "kebabs";
  normalize: (record: SourceRecord) => Facility | null;
}
export const categoryImports: Record<Category, CategoryImport> = {
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
