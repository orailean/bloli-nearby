export const VENDING_PRODUCTS = [
  "drinks",
  "snacks",
  "food",
  "coffee",
  "milk",
  "eggs",
  "bread",
  "ice_cream",
  "cigarettes",
  "tickets",
  "other",
  "unknown",
] as const;
export type VendingProduct = (typeof VENDING_PRODUCTS)[number];
export type VendingPayment = "all" | "cash" | "card";
export type VendingAccess = "all" | "public";
export interface VendingData {
  products: string[];
  groups: VendingProduct[];
  payments: Array<"cash" | "card">;
}
