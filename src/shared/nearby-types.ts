export const ACCOMMODATION_TYPES = [
  "hotel",
  "motel",
  "guest_house",
  "hostel",
  "apartment",
  "chalet",
  "camp_site",
  "caravan_site",
] as const;
export type AccommodationType = (typeof ACCOMMODATION_TYPES)[number];
export interface AtmData {
  embedded: boolean;
  currencies: string[];
  deposit: "yes" | "no" | "unknown";
  withdrawal: "yes" | "no" | "unknown";
  network: string | null;
}
export interface AccommodationData {
  type: AccommodationType;
  stars: string | null;
  rooms: string | null;
  beds: string | null;
  receptionHours: string | null;
  checkIn: string | null;
  checkOut: string | null;
  internet: string | null;
  pets: string | null;
  phone: string | null;
}
