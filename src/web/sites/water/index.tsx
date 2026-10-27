import { Droplets, Smile, Coins } from "lucide-react";
import type { Content, FilterProps, ItemProps } from "../types.js";
import { DetailFields as FeeDetails } from "../loo/index.js";
import type { Locale } from "../../../shared/types.js";
export const Icon = Droplets;
export function Artwork({ t }: { t: Content }) {
  return (
    <div className="hero-art water-art" aria-hidden="true">
      <svg className="refill-scene" viewBox="0 0 400 320" fill="none">
        <ellipse cx="224" cy="284" rx="137" ry="15" fill="#e8f7fc" />
        <path
          d="M56 281V70q0-20 20-20h92q20 0 20 20v25"
          stroke="#12335b"
          strokeWidth="24"
          strokeLinecap="round"
        />
        <path
          d="M66 70V59h96q16 0 16 16"
          stroke="#fff"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M156 36h63m-31-15v31"
          stroke="#087e8b"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          className="water-stream"
          d="M188 111v40"
          stroke="#1459d9"
          strokeWidth="10"
          strokeDasharray="7 12"
          strokeLinecap="round"
        />
        <g className="water-bottle">
          <path
            d="M167 164v-14h44v14l24 28v71q0 14-14 14h-64q-14 0-14-14v-71z"
            fill="#fff"
            stroke="#12335b"
            strokeWidth="5"
            strokeLinejoin="round"
          />
          <path
            className="bottle-water"
            d="M147 213q20-14 43 0t41 0v48q0 12-12 12h-60q-12 0-12-12z"
            fill="#1459d9"
          />
          <path
            d="M153 194v61"
            stroke="#b7eaf4"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <circle cx="175" cy="238" r="3.5" fill="#fff" />
          <circle cx="204" cy="238" r="3.5" fill="#fff" />
          <path
            d="M181 251q8 8 16 0"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
        <path
          d="M305 98s-35 43-35 64a35 35 0 0 0 70 0c0-21-35-64-35-64Z"
          fill="#e4f46d"
          stroke="#12335b"
          strokeWidth="4"
        />
        <path
          d="M288 161q0 14 12 19"
          stroke="#fff"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M105 283h216"
          stroke="#12335b"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
      <span className="art-caption">{t.sticker}</span>
    </div>
  );
}
export function Filters({ t, fee, onFee }: FilterProps) {
  return (
    <div className="fee-filters" role="group" aria-label={t.fee}>
      {(["all", "free", "paid"] as const).map((f) => (
        <button
          key={f}
          aria-pressed={fee === f}
          className={fee === f ? "active" : ""}
          onClick={() => onFee(f)}
        >
          {f === "all" ? (
            <Droplets size={16} />
          ) : f === "free" ? (
            <Smile size={16} />
          ) : (
            <Coins size={16} />
          )}
          <span>{t[f]}</span>
        </button>
      ))}
    </div>
  );
}
export function Summary({ item, t }: ItemProps) {
  return (
    <>
      <span className="water-kind">
        <Droplets size={14} />
        {item.waterType === "refill" ? t.refillPartner : t.waterPoint}
      </span>
      <span className={`fee-badge ${item.fee}`}>
        {item.fee === "free"
          ? t.freeBadge
          : item.fee === "paid"
            ? t.paidBadge
            : t.feeUnknown}
      </span>
    </>
  );
}
export function DetailFields(props: ItemProps & { locale: Locale }) {
  const { item, t } = props;
  const value = (v: string) => (v === "yes" ? t.yes : v === "no" ? t.no : v);
  return (
    <>
      <FeeDetails {...props} />
      <div>
        <dt>{t.waterKind}</dt>
        <dd>{item.waterType === "refill" ? t.refillPartner : t.waterPoint}</dd>
      </div>
      {(
        [
          ["bottle", t.bottleSuitability],
          ["seasonal", t.seasonality],
          ["refillNetwork", t.refillNetwork],
        ] as const
      ).map(([key, label]) =>
        item[key] ? (
          <div key={key}>
            <dt>{label}</dt>
            <dd>{value(item[key]!)}</dd>
          </div>
        ) : null,
      )}
    </>
  );
}
