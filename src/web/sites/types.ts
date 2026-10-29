import type { AccommodationType } from "../../shared/nearby-types.js";
import type { TransitMode } from "../../shared/transit-modes.js";
import type { Facility, FeeFilter } from "../../shared/types.js";
import type { SellerType } from "../../shared/sites.js";
import type {
  ChargeAccessFilter,
  ChargeConnectorFilter,
  ChargePower,
} from "../../shared/charge-types.js";
import type { dictionaries } from "../i18n.js";
export type Content = typeof dictionaries.en;
export interface FilterProps {
  currency?: string;
  onCurrency?: (value: string) => void;
  deposit?: "all" | "yes";
  onDeposit?: (value: "all" | "yes") => void;
  accommodationType?: AccommodationType | "all";
  onAccommodationType?: (value: AccommodationType | "all") => void;
  mode?: TransitMode | "all";
  onMode?: (mode: TransitMode | "all") => void;
  t: Content;
  fee: FeeFilter;
  onFee: (fee: FeeFilter) => void;
  sellerType: SellerType | "all";
  onSellerType: (type: SellerType | "all") => void;
  connector?: ChargeConnectorFilter;
  onConnector?: (connector: ChargeConnectorFilter) => void;
  minPowerKw?: ChargePower;
  onMinPower?: (power: ChargePower) => void;
  chargeAccess?: ChargeAccessFilter;
  onChargeAccess?: (access: ChargeAccessFilter) => void;
}
export interface ItemProps {
  item: Facility;
  t: Content;
}
