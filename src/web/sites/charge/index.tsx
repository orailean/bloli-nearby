import { BatteryCharging, Cable, Coins, Gauge, PlugZap } from "lucide-react";
import type { Content, FilterProps, ItemProps } from "../types.js";
import type { Locale } from "../../../shared/types.js";
import {
  CHARGE_CONNECTORS,
  CHARGE_POWERS,
  type ChargeAccessFilter,
  type ChargeConnectorFilter,
  type ChargePower,
} from "../../../shared/charge-types.js";
export const Icon = PlugZap;
export function Artwork({ t }: { t: Content }) {
  return (
    <div className="hero-art charge-art" aria-hidden="true">
      <svg className="charge-scene" viewBox="0 0 400 320" fill="none">
        <path
          className="charge-route"
          d="M44 257c35-2 34-72 83-72s46 59 96 59 44-106 111-106"
          stroke="#2448d8"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray="2 19"
        />
        <path
          d="M207 76h83a20 20 0 0 1 20 20v117a20 20 0 0 1-20 20h-83a20 20 0 0 1-20-20V96a20 20 0 0 1 20-20Z"
          fill="#fff"
          stroke="#17243d"
          strokeWidth="6"
        />
        <path d="M208 93h81v68h-81z" fill="#dce7ff" />
        <path d="m250 105-16 27h17l-9 18 27-32h-18l9-13z" fill="#e86a45" />
        <path
          d="M214 184h68m-51 19h34"
          stroke="#2448d8"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          className="charge-cable"
          d="M188 132h-28q-24 0-24 25v31q0 24-24 24H91"
          stroke="#17243d"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M62 197h30v31H62z"
          fill="#e86a45"
          stroke="#17243d"
          strokeWidth="5"
        />
        <path
          d="M69 191v-12m16 12v-12"
          stroke="#17243d"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle
          cx="92"
          cy="260"
          r="17"
          fill="#dce7ff"
          stroke="#17243d"
          strokeWidth="5"
        />
        <path
          d="M306 64h36m-18-18v36"
          stroke="#e86a45"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <path
          d="M37 278h325"
          stroke="#17243d"
          strokeWidth="5"
          strokeLinecap="round"
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
  connector = "all",
  onConnector,
  minPowerKw = 0,
  onMinPower,
  chargeAccess = "all",
  onChargeAccess,
}: FilterProps) {
  const options = CHARGE_CONNECTORS;
  const powers = CHARGE_POWERS;
  return (
    <div className="charge-filters">
      <label className="charge-select">
        <Cable size={17} />
        <span>{t.connector}</span>
        <select
          aria-label={t.connector}
          value={connector}
          onChange={(e) =>
            onConnector?.(e.target.value as ChargeConnectorFilter)
          }
        >
          {options.map((value) => (
            <option key={value} value={value}>
              {t[`connector_${value}` as keyof Content]}
            </option>
          ))}
        </select>
      </label>
      <label className="charge-select">
        <Gauge size={17} />
        <span>{t.minimumPower}</span>
        <select
          aria-label={t.minimumPower}
          value={minPowerKw}
          onChange={(e) => onMinPower?.(Number(e.target.value) as ChargePower)}
        >
          {powers.map((value) => (
            <option key={value} value={value}>
              {value === 0 ? t.anyPower : `${value} kW+`}
            </option>
          ))}
        </select>
      </label>
      <label className="charge-select">
        <BatteryCharging size={17} />
        <span>{t.chargeAccess}</span>
        <select
          aria-label={t.chargeAccess}
          value={chargeAccess}
          onChange={(e) =>
            onChargeAccess?.(e.target.value as ChargeAccessFilter)
          }
        >
          <option value="all">{t.allAccess}</option>
          <option value="public">{t.publicAccess}</option>
          <option value="customers">{t.customerAccess}</option>
        </select>
      </label>
      <div className="fee-filters" role="group" aria-label={t.chargingFee}>
        {(["all", "free", "paid"] as const).map((value) => (
          <button
            key={value}
            aria-pressed={fee === value}
            className={fee === value ? "active" : ""}
            onClick={() => onFee(value)}
          >
            <Coins size={16} />
            <span>
              {value === "all" ? t.all : value === "free" ? t.free : t.paid}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
export function Summary({ item, t }: ItemProps) {
  const charging = item.charging;
  const sockets = charging?.connectors ?? [];
  return (
    <>
      <span className="charge-summary-power">
        {sockets.length
          ? `${Math.max(...sockets.map((s) => s.outputKw ?? 0)) || "?"} kW`
          : t.chargingSpecificationUnknown}
      </span>
      <span className="charge-summary-connectors">
        {sockets
          .slice(0, 2)
          .map((s) => t[`connector_${s.type}` as keyof Content])
          .join(" · ") || t.socketOutputUnknown}
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
export function DetailFields({ item, t }: ItemProps & { locale: Locale }) {
  const data = item.charging;
  const payment = Object.entries(item.paymentMethods || {});
  if (!data)
    return (
      <div>
        <dt>{t.connector}</dt>
        <dd>{t.chargingSpecificationUnknown}</dd>
      </div>
    );
  const mappedFee =
    item.charge ||
    (item.fee === "free"
      ? t.freeBadge
      : item.fee === "paid"
        ? t.paidBadge
        : t.unknown);
  return (
    <>
      <div>
        <dt>{t.connector}</dt>
        <dd>
          {data.connectors.length
            ? data.connectors.map((s, i) => (
                <span className="charge-spec" key={s.key}>
                  {t[`connector_${s.type}` as keyof Content]}
                  {s.count ? ` · ${s.count}` : ""}
                  {s.outputKw
                    ? ` · ${s.outputKw} kW`
                    : s.rawOutput
                      ? ` · ${t.socketOutputUnknown}`
                      : ""}
                  {i < data.connectors.length - 1 ? "; " : ""}
                </span>
              ))
            : t.chargingSpecificationUnknown}
        </dd>
      </div>
      <div>
        <dt>{t.mappedPower}</dt>
        <dd>
          {data.connectors.some((s) => s.outputKw !== null)
            ? `${Math.max(...data.connectors.map((s) => s.outputKw ?? 0))} kW`
            : t.unknown}
        </dd>
      </div>
      <div>
        <dt>{t.chargeAccess}</dt>
        <dd>
          {item.access === "customers"
            ? t.customerAccess
            : item.access === "public"
              ? t.publicAccess
              : t.accessUnknown}
        </dd>
      </div>
      {data.accessRestriction === "destination" && (
        <div>
          <dt>{t.accessRestriction}</dt>
          <dd>{t.accessDestination}</dd>
        </div>
      )}
      <div>
        <dt>{t.chargingFee}</dt>
        <dd>{mappedFee}</dd>
      </div>
      {item.feeText && (
        <div>
          <dt>{t.mappedTariff}</dt>
          <dd>{item.feeText}</dd>
        </div>
      )}
      {data.parkingFee && (
        <div>
          <dt>{t.parkingFee}</dt>
          <dd>
            {data.parkingFee === "yes"
              ? t.yes
              : data.parkingFee === "no"
                ? t.no
                : data.parkingFee}
          </dd>
        </div>
      )}
      {data.network && (
        <div>
          <dt>{t.network}</dt>
          <dd>{data.network}</dd>
        </div>
      )}
      {item.brand && (
        <div>
          <dt>{t.brand}</dt>
          <dd>{item.brand}</dd>
        </div>
      )}
      {data.capacity !== null && (
        <div>
          <dt>{t.capacity}</dt>
          <dd>{data.capacity}</dd>
        </div>
      )}
      <div>
        <dt>{t.payment}</dt>
        <dd>
          {payment.length
            ? payment.map(([key, value]) => (
                <span className="payment-entry" key={key}>
                  {Object.hasOwn(t, `payment_${key}`)
                    ? t[`payment_${key}` as keyof Content]
                    : key.replaceAll("_", " ")}
                  :{" "}
                  {value === "yes" ? t.yes : value === "no" ? t.no : value}{" "}
                </span>
              ))
            : t.paymentUnknown}
        </dd>
      </div>
      {Object.keys(data.authenticationMethods).length > 0 && (
        <div>
          <dt>{t.authentication}</dt>
          <dd>
            {Object.entries(data.authenticationMethods)
              .map(([key, value]) => `${key}: ${value}`)
              .join(" · ")}
          </dd>
        </div>
      )}
      {item.website && (
        <div>
          <dt>{t.chargingWebsite}</dt>
          <dd>
            <a href={item.website} target="_blank" rel="noopener noreferrer">
              {new URL(item.website).hostname}
            </a>
          </dd>
        </div>
      )}
      <div>
        <dt>{t.directions}</dt>
        <dd>{t.stationTarget}</dd>
      </div>
    </>
  );
}
