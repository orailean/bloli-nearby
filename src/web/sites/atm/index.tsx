import { Banknote, Coins, WalletCards } from "lucide-react";
import type { Content, FilterProps, ItemProps } from "../types.js";
export const Icon = Banknote;
export function Artwork({ t }: { t: Content }) {
  return (
    <div className="hero-art atm-art" aria-hidden="true">
      <svg className="atm-scene" viewBox="0 0 400 320" fill="none">
        <rect x="62" y="32" width="276" height="228" rx="26" fill="#162c45" />
        <rect x="87" y="54" width="226" height="88" rx="8" fill="#bde8d4" />
        <path
          d="M107 78h75m-75 16h43m-43 24h183"
          stroke="#162c45"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cx="268" cy="93" r="20" stroke="#162c45" strokeWidth="3" />
        <path
          d="M258 86h16m-18 7h16m-14 6h16"
          stroke="#162c45"
          strokeWidth="3"
        />
        <rect x="91" y="158" width="218" height="18" rx="9" fill="#091b2d" />
        <g className="atm-slip">
          <path
            d="M119 167h162v125l-10-6-10 6-10-6-10 6-10-6-10 6-10-6-10 6-10-6-10 6-10-6-10 6-10-6-10 6-10-6-12 6z"
            fill="#f7fbf8"
            stroke="#162c45"
            strokeWidth="3"
          />
          <path
            d="M137 190h126m-126 16h126m-126 17h72m-72 28h126"
            stroke="#73948c"
            strokeWidth="3"
            strokeDasharray="4 4"
          />
          <path d="M239 221h24m-24 9h24" stroke="#162c45" strokeWidth="5" />
        </g>
        <g transform="rotate(-13 79 234)">
          <rect
            x="23"
            y="209"
            width="106"
            height="58"
            rx="4"
            fill="#bde8d4"
            stroke="#162c45"
            strokeWidth="3"
          />
          <rect
            x="33"
            y="219"
            width="86"
            height="38"
            rx="4"
            stroke="#558673"
            strokeWidth="2"
          />
          <ellipse
            cx="76"
            cy="238"
            rx="13"
            ry="16"
            stroke="#558673"
            strokeWidth="2"
          />
        </g>
        <path
          d="M325 216h32m-16-16v32"
          stroke="#558673"
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
  currency = "all",
  onCurrency,
  deposit = "all",
  onDeposit,
}: FilterProps) {
  return (
    <div className="atm-filters">
      <label className="atm-select">
        <WalletCards size={17} />
        <span>{t.atmCurrency}</span>
        <select value={currency} onChange={(e) => onCurrency?.(e.target.value)}>
          <option value="all">{t.atmAnyCurrency}</option>
          {["EUR", "RON", "HUF", "USD", "GBP", "CHF"].map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </label>
      <label className="atm-select">
        <Banknote size={17} />
        <span>{t.atmDeposit}</span>
        <select
          value={deposit}
          onChange={(e) => onDeposit?.(e.target.value as "all" | "yes")}
        >
          <option value="all">{t.atmAnyService}</option>
          <option value="yes">{t.atmDepositYes}</option>
        </select>
      </label>
      <div className="fee-filters" role="group" aria-label={t.atmMachineFee}>
        {(["all", "free", "paid", "unknown"] as const).map((value) => (
          <button
            key={value}
            className={fee === value ? "active" : ""}
            aria-pressed={fee === value}
            onClick={() => onFee(value)}
          >
            <Coins size={14} />
            <span>
              {value === "all"
                ? t.atmAllFees
                : value === "free"
                  ? t.atmMappedFree
                  : value === "paid"
                    ? t.atmMappedPaid
                    : t.unknown}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
export function Summary({ item, t }: ItemProps) {
  return (
    <>
      <span className="atm-currency-badge">
        {item.atm?.currencies.join(" / ") || t.atmCurrencyUnknown}
      </span>
      <span className={`fee-badge ${item.fee}`}>
        {item.fee === "free"
          ? t.atmMappedFree
          : item.fee === "paid"
            ? t.atmMappedPaid
            : t.feeUnknown}
      </span>
      {item.atm?.embedded && (
        <span className="atm-location-badge">{t.atmEmbeddedShort}</span>
      )}
    </>
  );
}
export function DetailFields({ item, t }: ItemProps) {
  const data = item.atm;
  const service = (value: string | undefined) =>
    value === "yes" ? t.yes : value === "no" ? t.no : t.unknown;
  return (
    <>
      <div>
        <dt>{t.atmCurrency}</dt>
        <dd>{data?.currencies.join(", ") || t.unknown}</dd>
      </div>
      <div>
        <dt>{t.atmWithdrawal}</dt>
        <dd>{service(data?.withdrawal)}</dd>
      </div>
      <div>
        <dt>{t.atmDeposit}</dt>
        <dd>{service(data?.deposit)}</dd>
      </div>
      <div>
        <dt>{t.atmMachineFee}</dt>
        <dd>
          {item.charge ||
            (item.fee === "free"
              ? t.atmMappedFree
              : item.fee === "paid"
                ? t.atmMappedPaid
                : t.unknown)}
        </dd>
      </div>
      {item.feeText && (
        <div>
          <dt>{t.atmFeeText}</dt>
          <dd>{item.feeText}</dd>
        </div>
      )}
      {data?.network && (
        <div>
          <dt>{t.network}</dt>
          <dd>{data.network}</dd>
        </div>
      )}
      <div className="atm-detail-note">
        <dt>{t.atmLocation}</dt>
        <dd>{data?.embedded ? t.atmEmbedded : t.atmMachinePoint}</dd>
      </div>
      <div className="atm-detail-note">
        <dt>{t.atmFeeNoteLabel}</dt>
        <dd>{t.atmFeeNote}</dd>
      </div>
      {item.website && (
        <div>
          <dt>{t.atmWebsite}</dt>
          <dd>
            <a href={item.website} target="_blank" rel="noopener noreferrer">
              {t.atmVisitWebsite}
            </a>
          </dd>
        </div>
      )}
    </>
  );
}
