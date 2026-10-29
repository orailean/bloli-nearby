import { BedDouble, Luggage } from "lucide-react";
import type { AccommodationType } from "../../../shared/nearby-types.js";
import type { Content, FilterProps, ItemProps } from "../types.js";
export const Icon = BedDouble;
const types: AccommodationType[] = [
  "hotel",
  "motel",
  "guest_house",
  "hostel",
  "apartment",
  "chalet",
  "camp_site",
  "caravan_site",
];
const typeLabel = (value: AccommodationType, t: Content) =>
  t[`stayType_${value}`];
export function Artwork({ t }: { t: Content }) {
  return (
    <div className="hero-art stay-art" aria-hidden="true">
      <svg className="stay-scene" viewBox="0 0 400 320" fill="none">
        <g className="stay-postcard">
          <path
            d="M38 65 338 36l22 214-300 29z"
            fill="#fffdf7"
            stroke="#344963"
            strokeWidth="3"
          />
          <path d="m53 78 272-26 15 151-272 26z" fill="#cbd9df" />
          <circle cx="278" cy="91" r="23" fill="#edbf77" />
          <path
            d="m63 191 79-89 67 56 42-48 86 65 3 28-272 26z"
            fill="#829593"
          />
          <path d="m64 206 104-45 82 26 87-12 3 28-272 26z" fill="#344963" />
          <path d="m140 188-4-58 60-6 5 58z" fill="#fff8ec" />
          <path d="m122 132 41-38 50 29z" fill="#a74731" />
          <path d="m156 186-2-29 18-2 3 29" fill="#a74731" />
          <path
            d="m182 140 2 13m-39-10 1 13"
            stroke="#344963"
            strokeWidth="6"
          />
          <path
            d="m80 249 86-8m16-2 57-5"
            stroke="#a74731"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="m282 222 44-4 3 33-44 4z"
            stroke="#a74731"
            strokeWidth="2"
            strokeDasharray="3 3"
          />
        </g>
        <g className="stay-tag" transform="rotate(12 294 262)">
          <path
            d="M242 241 263 222h80v78h-80l-21-19z"
            fill="#edbf77"
            stroke="#344963"
            strokeWidth="3"
          />
          <circle
            cx="258"
            cy="261"
            r="5"
            fill="#fff8ec"
            stroke="#344963"
            strokeWidth="2"
          />
          <path d="M258 257q-35-61 1-86" stroke="#344963" strokeWidth="3" />
          <path
            d="M280 250h44m-44 12h29m-29 12h38"
            stroke="#344963"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      </svg>
      <span className="art-caption">{t.sticker}</span>
    </div>
  );
}
export function Filters({
  t,
  accommodationType = "all",
  onAccommodationType,
}: FilterProps) {
  return (
    <label className="stay-type-control">
      <Luggage size={19} />
      <span>{t.stayType}</span>
      <select
        value={accommodationType}
        onChange={(e) =>
          onAccommodationType?.(e.target.value as AccommodationType | "all")
        }
      >
        <option value="all">{t.stayAllTypes}</option>
        {types.map((value) => (
          <option key={value} value={value}>
            {typeLabel(value, t)}
          </option>
        ))}
      </select>
    </label>
  );
}
export function Summary({ item, t }: ItemProps) {
  return (
    <>
      <span className="stay-type-badge">
        {item.accommodation
          ? typeLabel(item.accommodation.type, t)
          : t.fallbackName}
      </span>
      {item.accommodation?.stars && (
        <span className="stay-classification">
          {t.stayStars}: {item.accommodation.stars}
        </span>
      )}
    </>
  );
}
export function DetailFields({ item, t }: ItemProps) {
  const data = item.accommodation;
  const addressPart = (key: string) => item.tags[key]?.trim() || "";
  const address =
    addressPart("addr:full") ||
    [
      [addressPart("addr:street"), addressPart("addr:housenumber")]
        .filter(Boolean)
        .join(" "),
      [addressPart("addr:postcode"), addressPart("addr:city")]
        .filter(Boolean)
        .join(" "),
      addressPart("addr:country"),
    ]
      .filter(Boolean)
      .join(", ");
  const amenity = (value: string) =>
    value === "yes" ? t.yes : value === "no" ? t.no : value;
  return (
    <>
      {data && (
        <div>
          <dt>{t.stayType}</dt>
          <dd>{typeLabel(data.type, t)}</dd>
        </div>
      )}
      {address && (
        <div>
          <dt>{t.stayAddress}</dt>
          <dd>{address}</dd>
        </div>
      )}
      {data?.stars && (
        <div>
          <dt>{t.stayStars}</dt>
          <dd>{data.stars}</dd>
        </div>
      )}
      {data?.rooms && (
        <div>
          <dt>{t.stayRooms}</dt>
          <dd>{data.rooms}</dd>
        </div>
      )}
      {data?.beds && (
        <div>
          <dt>{t.stayBeds}</dt>
          <dd>{data.beds}</dd>
        </div>
      )}
      {data?.receptionHours && (
        <div>
          <dt>{t.stayReception}</dt>
          <dd>{data.receptionHours}</dd>
        </div>
      )}
      {data?.checkIn && (
        <div>
          <dt>{t.stayCheckIn}</dt>
          <dd>{data.checkIn}</dd>
        </div>
      )}
      {data?.checkOut && (
        <div>
          <dt>{t.stayCheckOut}</dt>
          <dd>{data.checkOut}</dd>
        </div>
      )}
      {data?.internet && (
        <div>
          <dt>{t.stayInternet}</dt>
          <dd>{amenity(data.internet)}</dd>
        </div>
      )}
      {data?.pets && (
        <div>
          <dt>{t.stayPets}</dt>
          <dd>{amenity(data.pets)}</dd>
        </div>
      )}
      {data?.phone && (
        <div>
          <dt>{t.stayPhone}</dt>
          <dd>{data.phone}</dd>
        </div>
      )}
      {item.website && (
        <div>
          <dt>{t.stayWebsite}</dt>
          <dd>
            <a
              className="stay-contact-link"
              href={item.website}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.stayVisitWebsite}
            </a>
          </dd>
        </div>
      )}
      <div className="stay-availability-note">
        <dt>{t.stayAvailability}</dt>
        <dd>{t.stayAvailabilityNote}</dd>
      </div>
    </>
  );
}
