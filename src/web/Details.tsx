import {
  ArrowUpRight,
  Clock,
  Accessibility,
  DoorOpen,
  Coins,
  MapPin,
  Navigation,
  Info,
} from "lucide-react";
import type { Facility, Locale } from "../shared/types.js";
import type { ComponentType } from "react";
import type { SiteId } from "../shared/sites.js";
import type { ItemProps } from "./sites/types.js";
import { siteDictionaries } from "./i18n.js";
import { directionsUrl } from "../shared/domain.js";
export default function Details({
  item,
  locale,
  datasetAt,
  siteId,
  DetailFields,
}: {
  item: Facility;
  locale: Locale;
  datasetAt: string | null;
  siteId: SiteId;
  DetailFields: ComponentType<ItemProps & { locale: Locale }>;
}) {
  const t = siteDictionaries[siteId][locale];
  return (
    <section className="detail-panel" aria-label={t.details}>
      <div className="detail-heading">
        <Info size={16} />
        <span>{t.details}</span>
      </div>
      <dl>
        <DetailFields item={item} t={t} locale={locale} />
        <div>
          <dt>
            <Clock size={16} />
            {t.hours}
          </dt>
          <dd>
            {item.hoursAssumed
              ? t.machineHoursAssumed
              : item.openingHours || t.unknown}
          </dd>
        </div>
        <div>
          <dt>
            <DoorOpen size={16} />
            {t.access}
          </dt>
          <dd>
            {item.access === "customers"
              ? t.customers
              : item.access === "public"
                ? t.public
                : t.accessUnknown}
          </dd>
        </div>
        <div>
          <dt>
            <Accessibility size={16} />
            {t.wheelchair}
          </dt>
          <dd>{t[item.wheelchair]}</dd>
        </div>
        <div>
          <dt>{t.operator}</dt>
          <dd>{item.operator || t.unknown}</dd>
        </div>
        {datasetAt && (
          <div>
            <dt>{t.sourceDate}</dt>
            <dd>
              {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                new Date(datasetAt),
              )}
            </dd>
          </div>
        )}
      </dl>
      <p className="fineprint">{t.sourceHours}</p>
      {item.notes && <p className="source-note">{item.notes}</p>}
      <a
        className="walk-button"
        href={directionsUrl(item.lat, item.lon)}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Navigation size={18} aria-hidden="true" />
        {t.directions}
        <ArrowUpRight size={18} aria-hidden="true" />
      </a>
      <a
        className="source-link"
        href={`https://www.openstreetmap.org/${item.sourceType}/${item.sourceId}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <MapPin size={14} aria-hidden="true" />
        {t.source}
        <ArrowUpRight size={13} aria-hidden="true" />
      </a>
    </section>
  );
}
