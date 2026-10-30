export const VIEW_TYPES = ["viewpoint", "tower"] as const;
export const SIGHT_TYPES = [
  "museum",
  "attraction",
  "castle",
  "ruins",
  "monument",
  "memorial",
  "archaeological_site",
] as const;
export type ViewType = (typeof VIEW_TYPES)[number];
export type SightType = (typeof SIGHT_TYPES)[number];
export interface TouristData {
  type: ViewType | SightType;
  elevation: string | null;
  height: string | null;
  direction: string | null;
  phone: string | null;
}
