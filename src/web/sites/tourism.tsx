import { Coins, Compass, ExternalLink } from "lucide-react";
import {
  VIEW_TYPES,
  SIGHT_TYPES,
  type TouristData,
} from "../../shared/tourism-types.js";
import type { Locale } from "../../shared/types.js";
import type { Content, FilterProps, ItemProps } from "./types.js";
import { DetailFields as FeeDetails } from "./loo/index.js";
export const typeLabel = (type: TouristData["type"], t: Content) =>
  t[`touristType_${type}`];
export function TouristFilters({
  kind,
  ...props
}: FilterProps & { kind: "view" | "sights" }) {
  const { t, fee, onFee } = props;
  const types = kind === "view" ? VIEW_TYPES : SIGHT_TYPES;
  return (
    <div className="tourist-filters">
      <label className="tourist-type-control">
        <Compass size={17} />
        <span>{t.touristKind}</span>
        <select
          value={kind === "view" ? props.viewType : props.sightType}
          onChange={(event) => {
            if (kind === "view")
              props.onViewType?.(
                event.target.value as typeof props.viewType & string,
              );
            else
              props.onSightType?.(
                event.target.value as typeof props.sightType & string,
              );
          }}
        >
          <option value="all">{t.touristAllTypes}</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {typeLabel(type, t)}
            </option>
          ))}
        </select>
      </label>
      <div className="fee-filters" role="group" aria-label={t.fee}>
        {(["all", "free", "paid"] as const).map((value) => (
          <button
            key={value}
            aria-pressed={fee === value}
            className={fee === value ? "active" : ""}
            onClick={() => onFee(value)}
          >
            <Coins size={15} />
            <span>{t[value]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
export function Summary({ item, t }: ItemProps) {
  return (
    <>
      <span className="tourist-kind">
        {item.tourist ? typeLabel(item.tourist.type, t) : t.fallbackName}
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
  const data = item.tourist;
  return (
    <>
      <FeeDetails {...props} />
      {data && (
        <div>
          <dt>{t.touristKind}</dt>
          <dd>{typeLabel(data.type, t)}</dd>
        </div>
      )}
      {item.category === "view" &&
        data &&
        (
          [
            ["elevation", t.touristElevation],
            ["height", t.touristHeight],
            ["direction", t.touristDirection],
          ] as const
        ).map(([key, label]) =>
          data[key] ? (
            <div key={key}>
              <dt>{label}</dt>
              <dd>{data[key]}</dd>
            </div>
          ) : null,
        )}
      {data?.phone && (
        <div>
          <dt>{t.touristPhone}</dt>
          <dd>{data.phone}</dd>
        </div>
      )}
      {item.website && (
        <div>
          <dt>{t.touristWebsite}</dt>
          <dd>
            <a href={item.website} target="_blank" rel="noopener noreferrer">
              {t.touristVisitWebsite} <ExternalLink size={13} />
            </a>
          </dd>
        </div>
      )}
      <div className="tourist-distance-note">
        <dt>{t.touristDistance}</dt>
        <dd>{t.touristDistanceNote}</dd>
      </div>
    </>
  );
}
