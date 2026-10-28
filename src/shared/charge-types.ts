export const CHARGE_CONNECTORS = [
  "all",
  "ccs",
  "type2",
  "chademo",
  "other",
] as const;
export type ChargeConnectorFilter = (typeof CHARGE_CONNECTORS)[number];
export const CHARGE_POWERS = [0, 22, 50, 150, 300] as const;
export type ChargePower = (typeof CHARGE_POWERS)[number];
export type ChargeAccessFilter = "all" | "public" | "customers";
export interface ChargingConnector {
  key: string;
  type: Exclude<ChargeConnectorFilter, "all">;
  count: number | null;
  outputKw: number | null;
  rawOutput: string | null;
}
export interface ChargingData {
  connectors: ChargingConnector[];
  accessRestriction: string | null;
  network: string | null;
  capacity: number | null;
  parkingFee: string | null;
  authenticationMethods: Record<string, string>;
}
