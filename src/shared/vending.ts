import { basePlace } from "./nearby-base.js";
import type { Facility, SourceRecord } from "./types.js";
import { VENDING_PRODUCTS, type VendingProduct } from "./vending-types.js";
export function normalizeVending(record: SourceRecord): Facility | null {
  const t = record.tags;
  if (
    t.amenity !== "vending_machine" ||
    [
      "disused",
      "abandoned",
      "demolished",
      "removed",
      "razed",
      "construction",
      "proposed",
    ].some((key) => Boolean(t[`${key}:vending`]))
  )
    return null;
  const base = basePlace(record);
  if (!base) return null;
  const products = [
    ...new Set(
      (t.vending || "")
        .toLowerCase()
        .split(";")
        .map((v) => v.trim())
        .filter((v) => v && !["yes", "unknown"].includes(v)),
    ),
  ];
  const aliases: Record<string, VendingProduct> = {
    beverages: "drinks",
    water: "drinks",
    soft_drinks: "drinks",
    sweets: "snacks",
    sandwich: "food",
    sandwiches: "food",
    pizza: "food",
    public_transport_tickets: "tickets",
    parking_tickets: "tickets",
  };
  const groups = [
    ...new Set(
      products.map(
        (product) =>
          aliases[product] ??
          (VENDING_PRODUCTS.includes(product as VendingProduct) &&
          product !== "unknown"
            ? (product as VendingProduct)
            : "other"),
      ),
    ),
  ];
  const payments: Array<"cash" | "card"> = [];
  const yes = (key: string) =>
    t[`payment:${key}`] === "yes" && !t[`payment:${key}:conditional`];
  if (
    t["payment:cash"] !== "no" &&
    !t["payment:cash:conditional"] &&
    ["cash", "coins", "notes"].some(yes)
  )
    payments.push("cash");
  const credit =
    t["payment:credit_cards"] !== "no" &&
    !t["payment:credit_cards:conditional"] &&
    ["credit_cards", "visa", "mastercard", "american_express"].some(yes);
  const debit =
    t["payment:debit_cards"] !== "no" &&
    !t["payment:debit_cards:conditional"] &&
    [
      "debit_cards",
      "maestro",
      "girocard",
      "visa_debit",
      "mastercard_debit",
    ].some(yes);
  if (
    t["payment:cards"] !== "no" &&
    !t["payment:cards:conditional"] &&
    (yes("cards") || credit || debit)
  )
    payments.push("card");
  return {
    ...base,
    category: "vending",
    brand: t.brand || null,
    vending: { products, groups, payments },
    paymentMethods: Object.fromEntries(
      Object.entries(t)
        .filter(([key]) => key.startsWith("payment:"))
        .map(([key, value]) => [key.slice(8), value]),
    ),
  };
}
