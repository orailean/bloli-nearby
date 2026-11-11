export const PARKING_TYPES = [
  "surface",
  "underground",
  "multi-storey",
  "other",
  "unknown",
] as const;
export type ParkingType = (typeof PARKING_TYPES)[number];
export type ParkingAccess = "all" | "public" | "customers" | "unknown";
export type ParkingFeature = "all" | "yes";
export interface ParkingEntrance {
  lat: number;
  lon: number;
  sourceType: "node" | "way" | "relation";
  sourceId: string;
  maxheight?: string;
}
export interface ParkingData {
  type: ParkingType;
  capacity: number | null;
  disabledCapacity: number | null;
  maxstay: string | null;
  maxheight: string | null;
  surface: string | null;
  parkRide: boolean | null;
  hiking: boolean | null;
  entrance?: ParkingEntrance | null;
}
