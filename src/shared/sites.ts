export type SiteId = "loo" | "kippe" | "kebab" | "water" | "transit" | "charge";
export type Category =
  | "toilets"
  | "tobacco"
  | "kebab"
  | "water"
  | "transit"
  | "charge";
export type SellerType = "machine" | "shop" | "fuel";
export interface SiteProfile {
  id: SiteId;
  category: Category;
  name: string;
  domain: string;
  directionsMode?: "walking" | "driving";
  capabilities: { fee: boolean; sellerType: boolean; openNow: boolean };
}
export const sites: Record<SiteId, SiteProfile> = {
  charge: {
    id: "charge",
    category: "charge",
    name: "Charge",
    domain: "charge.bloli.com",
    directionsMode: "driving",
    capabilities: { fee: true, sellerType: false, openNow: true },
  },
  transit: {
    id: "transit",
    category: "transit",
    name: "Transit",
    domain: "transit.bloli.com",
    capabilities: { fee: false, sellerType: false, openNow: false },
  },
  water: {
    id: "water",
    category: "water",
    name: "Water",
    domain: "water.bloli.com",
    capabilities: { fee: true, sellerType: false, openNow: true },
  },
  kebab: {
    id: "kebab",
    category: "kebab",
    name: "Kebab",
    domain: "kebab.bloli.com",
    capabilities: { fee: false, sellerType: false, openNow: true },
  },
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
  const profiles = Object.values(sites);
  const publicSite = profiles.find((site) => site.domain === normalized);
  if (publicSite) return publicSite;
  if (production) return null;
  const localSite = profiles.find(
    (site) => `${site.id}.localhost` === normalized,
  );
  if (["localhost", "127.0.0.1", "[::1]"].includes(normalized) || localSite) {
    if (override && Object.hasOwn(sites, override))
      return sites[override as SiteId];
    return localSite ?? sites.loo;
  }
  return null;
}
