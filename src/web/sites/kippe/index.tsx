import {
  Store,
  Fuel,
  RectangleVertical,
  CreditCard,
  ArrowDown,
} from "lucide-react";
import type { FilterProps, Content, ItemProps } from "../types.js";
export const Icon = Store;
const sellerIcons = { machine: RectangleVertical, shop: Store, fuel: Fuel };
export function Artwork({ t }: { t: Content }) {
  return (
    <div className="hero-art vending-art" aria-hidden="true">
      <div className="vending-character">
        <div className="vending-awning" />
        <div className="vending-face">
          <i />
          <i />
          <span />
        </div>
        <div className="vending-window">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="vending-controls">
          <i />
          <i />
          <span />
        </div>
        <div className="vending-tray" />
        <div className="vending-feet">
          <i />
          <i />
        </div>
      </div>
      <span className="art-caption">
        {t.sticker}
        <ArrowDown size={20} />
      </span>
    </div>
  );
}
export function Filters({ t, sellerType, onSellerType }: FilterProps) {
  return (
    <div
      className="fee-filters seller-filters"
      role="group"
      aria-label={t.sellerType}
    >
      {(["all", "machine", "shop", "fuel"] as const).map((type) => {
        const TypeIcon = type === "all" ? Store : sellerIcons[type];
        return (
          <button
            key={type}
            aria-pressed={sellerType === type}
            className={sellerType === type ? "active" : ""}
            onClick={() => onSellerType(type)}
          >
            <TypeIcon size={16} />
            <span>{t[type]}</span>
          </button>
        );
      })}
    </div>
  );
}
export function Summary({ item, t }: ItemProps) {
  const type = item.sellerType;
  const TypeIcon = type ? sellerIcons[type] : Store;
  return (
    <>
      <span className={`seller-badge ${type || ""}`}>
        <TypeIcon size={14} />
        {type ? t[type] : t.fallbackName}
      </span>
    </>
  );
}
export function DetailFields({ item, t }: ItemProps) {
  const payment = Object.entries(item.paymentMethods || {});
  return (
    <>
      <div>
        <dt>
          <Store size={16} />
          {t.sellerType}
        </dt>
        <dd>{item.sellerType ? t[item.sellerType] : t.unknown}</dd>
      </div>
      <div>
        <dt>
          <CreditCard size={16} />
          {t.payment}
        </dt>
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
      <div>
        <dt>{t.brand}</dt>
        <dd>{item.brand || t.unknown}</dd>
      </div>
      {item.tobaccoSales === "mapped" && (
        <div>
          <dt>{t.tobaccoAvailability}</dt>
          <dd>{t.tobaccoSalesMapped}</dd>
        </div>
      )}
      <div className="availability-note">
        <dd>{t.availability}</dd>
      </div>
    </>
  );
}
