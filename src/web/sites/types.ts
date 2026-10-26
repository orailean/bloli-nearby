import type { Facility, FeeFilter } from "../../shared/types.js";
import type { SellerType } from "../../shared/sites.js";
import type { dictionaries } from "../i18n.js";
export type Content = typeof dictionaries.en;
export interface FilterProps {
  t: Content;
  fee: FeeFilter;
  onFee: (fee: FeeFilter) => void;
  sellerType: SellerType | "all";
  onSellerType: (type: SellerType | "all") => void;
}
export interface ItemProps {
  item: Facility;
  t: Content;
}
