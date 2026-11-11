import { ParkingSquare } from "lucide-react";
import {
  PARKING_TYPES,
  type ParkingType,
  type ParkingAccess,
  type ParkingFeature,
} from "../../../shared/parking-types.js";
import type { Content, FilterProps, ItemProps } from "../types.js";
export const Icon = ParkingSquare;
const typeLabel = (value: ParkingType, t: Content) => t[`parkType_${value}`];
export function Artwork({ t }: { t: Content }) {
  return (
    <div className="hero-art park-art" aria-hidden="true">
      <svg className="park-scene" viewBox="0 0 400 320" fill="none">
        <path
          d="M40 281L123 154H339L381 281Z"
          fill="#d8e5ed"
          stroke="#264c69"
          strokeWidth="4"
        />
        <path
          d="M87 267L148 170M162 267L198 170M239 267L249 170M315 267L299 170"
          stroke="#fff"
          strokeWidth="5"
        />
        <path d="M69 269V57" stroke="#264c69" strokeWidth="9" />
        <rect
          x="27"
          y="33"
          width="87"
          height="100"
          rx="12"
          fill="#23568b"
          stroke="#264c69"
          strokeWidth="4"
        />
        <path
          d="M57 111V55H77C101 55 101 86 77 86H57"
          stroke="#fff"
          strokeWidth="10"
          strokeLinejoin="round"
        />
        <path
          d="M175 205L187 169Q190 160 202 160H252Q264 160 268 171L280 205"
          fill="#e9b352"
          stroke="#264c69"
          strokeWidth="4"
        />
        <rect
          x="172"
          y="199"
          width="112"
          height="49"
          rx="14"
          fill="#e9b352"
          stroke="#264c69"
          strokeWidth="4"
        />
        <path d="M194 178H259L266 196H188Z" fill="#f6fbff" />
        <path
          d="M186 249V258M270 249V258"
          stroke="#264c69"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M186 216H200M255 216H270"
          stroke="#fff"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M326 104V163M326 69C291 69 294 117 326 117C362 117 361 69 326 69Z"
          fill="#8caf8d"
          stroke="#264c69"
          strokeWidth="4"
        />
      </svg>
      <span className="art-caption">{t.sticker}</span>
    </div>
  );
}
export function Filters({
  t,
  fee,
  onFee,
  parkingType,
  onParkingType,
  parkingAccess,
  onParkingAccess,
  parkRide,
  onParkRide,
  hiking,
  onHiking,
}: FilterProps) {
  return (
    <div className="park-filters">
      <label>
        <span>{t.fee}</span>
        <select
          value={fee}
          onChange={(e) => onFee(e.target.value as typeof fee)}
        >
          {(["all", "free", "paid", "unknown"] as const).map((v) => (
            <option key={v} value={v}>
              {v === "all" ? t.parkAnyFee : t[v]}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{t.parkType}</span>
        <select
          value={parkingType}
          onChange={(e) =>
            onParkingType?.(e.target.value as ParkingType | "all")
          }
        >
          <option value="all">{t.parkAnyType}</option>
          {PARKING_TYPES.map((v) => (
            <option key={v} value={v}>
              {typeLabel(v, t)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{t.access}</span>
        <select
          value={parkingAccess}
          onChange={(e) => onParkingAccess?.(e.target.value as ParkingAccess)}
        >
          <option value="all">{t.parkAnyAccess}</option>
          <option value="public">{t.public}</option>
          <option value="customers">{t.customers}</option>
          <option value="unknown">{t.accessUnknown}</option>
        </select>
      </label>
      <label>
        <span>{t.parkRide}</span>
        <select
          value={parkRide}
          onChange={(e) => onParkRide?.(e.target.value as ParkingFeature)}
        >
          <option value="all">{t.parkAnyFeature}</option>
          <option value="yes">{t.parkConfirmed}</option>
        </select>
      </label>
      <label>
        <span>{t.parkHiking}</span>
        <select
          value={hiking}
          onChange={(e) => onHiking?.(e.target.value as ParkingFeature)}
        >
          <option value="all">{t.parkAnyFeature}</option>
          <option value="yes">{t.parkConfirmed}</option>
        </select>
      </label>
    </div>
  );
}
export function Summary({ item, t }: ItemProps) {
  return (
    <span className="park-summary">
      {typeLabel(item.parking?.type ?? "unknown", t)}
      {item.parking?.capacity != null
        ? ` · ${item.parking.capacity} ${t.parkSpaces}`
        : ""}
    </span>
  );
}
export function DetailFields({ item, t }: ItemProps) {
  const p = item.parking;
  const fields: [string, string | number | null | undefined][] = [
    [t.parkDestination, p?.entrance ? t.parkEntrance : t.parkPoint],
    [t.parkType, typeLabel(p?.type ?? "unknown", t)],
    [t.parkCapacity, p?.capacity],
    [t.parkDisabledCapacity, p?.disabledCapacity],
    [t.fee, item.fee === "unknown" ? t.unknown : t[item.fee]],
    [t.priceInfo, item.feeText],
    [t.parkMaxstay, p?.maxstay],
    [t.parkMaxheight, p?.maxheight],
    [t.parkSurface, p?.surface],
    [t.parkRide, p?.parkRide == null ? t.unknown : p.parkRide ? t.yes : t.no],
    [t.parkHiking, p?.hiking == null ? t.unknown : p.hiking ? t.yes : t.no],
  ];
  return (
    <>
      {fields.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value ?? t.unknown}</dd>
        </div>
      ))}
      {p?.entrance?.maxheight && (
        <div>
          <dt>{t.parkEntranceMaxheight}</dt>
          <dd>{p.entrance.maxheight}</dd>
        </div>
      )}
      <div>
        <dt>{t.notes}</dt>
        <dd>{t.parkNote}</dd>
      </div>
    </>
  );
}
