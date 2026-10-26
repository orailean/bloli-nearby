export type SiteId = "loo" | "kippe";
export type Category = "toilets" | "tobacco";
export type SellerType = "machine" | "shop" | "fuel";
export interface SiteProfile {
  id: SiteId;
  category: Category;
  name: string;
  domain: string;
  capabilities: { fee: boolean; sellerType: boolean; openNow: boolean };
}
export const sites: Record<SiteId, SiteProfile> = {
  loo: {
    id: "loo",
    category: "toilets",
    name: "Find a Loo",
    domain: "loo.bloli.com",
    capabilities: { fee: true, sellerType: false, openNow: true },
  },
  kippe: {
    id: "kippe",
    category: "tobacco",
    name: "Kippe",
    domain: "kippe.bloli.com",
    capabilities: { fee: false, sellerType: true, openNow: true },
  },
};
export function resolveSite(
  host: string,
  production = false,
  override?: string,
): SiteProfile | null {
  const normalized = host.toLowerCase().replace(/\.$/, "").replace(/:\d+$/, "");
  if (normalized === "loo.bloli.com") return sites.loo;
  if (normalized === "kippe.bloli.com") return sites.kippe;
  if (production) return null;
  if (
    [
      "localhost",
      "127.0.0.1",
      "[::1]",
      "loo.localhost",
      "kippe.localhost",
    ].includes(normalized)
  ) {
    if (override === "loo" || override === "kippe") return sites[override];
    return normalized === "kippe.localhost" ? sites.kippe : sites.loo;
  }
  return null;
}
