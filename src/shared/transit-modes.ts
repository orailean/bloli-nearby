export const TRANSIT_MODES = [
  "train",
  "suburban_rail",
  "subway",
  "tram",
  "light_rail",
  "bus",
  "trolleybus",
  "taxi",
  "ferry",
  "cable",
  "funicular",
  "other_rail",
  "other",
] as const;
export type TransitMode = (typeof TRANSIT_MODES)[number];
export interface TransitRoute {
  id: string;
  mode: TransitMode;
  ref: string;
  network: string;
  evidence: string;
}
export interface TransitGroup {
  id: string;
  tags: Record<string, string>;
  routes?: TransitRoute[];
}
export interface TransitContext {
  groups: TransitGroup[];
  routes: TransitRoute[];
}
export interface TransitData {
  modes: TransitMode[];
  kind: "entrance" | "platform" | "station" | "stop" | "position";
  groupId: string | null;
  groupCandidates?: string[];
  contextWarning?: string | null;
  groupName: string | null;
  groupNames: Record<string, string>;
  routes: TransitRoute[];
  groupRoutes: TransitRoute[];
  localRef: string | null;
  network: string | null;
  componentId?: string;
  componentCount?: number;
  components?: {
    id: string;
    kind: string;
    name: string | null;
    ref: string | null;
    modes: TransitMode[];
    wheelchair: string;
  }[];
  approximate?: boolean;
  directionsAvailable?: boolean;
  linesTruncated?: boolean;
}
