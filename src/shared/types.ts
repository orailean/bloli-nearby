import type { Category, SiteProfile, SellerType } from "./sites.js";
export type Locale = "en" | "de" | "ro";
export type Fee = "free" | "paid" | "unknown";
export type FeeFilter = "all" | "free" | "paid";
export interface SourceRecord {
  sourceType: "node" | "way" | "relation";
  sourceId: string;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}
export interface Facility {
  id: string;
  sourceType: SourceRecord["sourceType"];
  sourceId: string;
  lat: number;
  lon: number;
  name: string | null;
  names: Partial<Record<Locale, string>>;
  fee: Fee;
  charge: string | null;
  feeText: string | null;
  access: "public" | "customers" | "unknown";
  wheelchair: "yes" | "no" | "limited" | "unknown";
  openingHours: string | null;
  hoursAssumed?: boolean;
  operator: string | null;
  notes: string | null;
  tags: Record<string, string>;
  distance?: number;
  category?: Category;
  sellerType?: SellerType;
  tobaccoSales?: "mapped" | "unconfirmed";
  paymentMethods?: Record<string, string>;
  brand?: string | null;
  waterType?: "point" | "refill";
  bottle?: string | null;
  seasonal?: string | null;
  refillNetwork?: string | null;
  cuisine?: string[];
  takeaway?: string | null;
  delivery?: string | null;
  dietary?: Record<string, string>;
  website?: string | null;
  menuUrl?: string | null;
}
export interface Settlement {
  nearCity: string | null;
  id: string;
  name: string;
  postcode: string | null;
  region: string | null;
  lat: number;
  lon: number;
  names: Partial<Record<Locale, string>>;
}
export interface SearchQuery {
  lat: number;
  lon: number;
  radius: number;
  limit: number;
  fee: FeeFilter;
  openNow: boolean;
  sellerType?: SellerType | "all";
}
export interface Dataset {
  ready: boolean;
  datasetAt: string | null;
  importedAt: string | null;
  count: number;
  stale: boolean;
  source: string | null;
  latestJob: { status: string; finishedAt: string | null } | null;
}
export interface SearchResponse {
  items: Facility[];
  truncated: boolean;
  dataset: Dataset;
}
export interface AppConfig {
  site?: SiteProfile;
  tileUrl: string;
  tileAttribution: string;
  tileMaxZoom: number;
  contactEmail: string;
}
