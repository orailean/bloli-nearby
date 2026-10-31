import { Store } from "lucide-react";
import {
  VENDING_PRODUCTS,
  type VendingProduct,
  type VendingPayment,
  type VendingAccess,
} from "../../../shared/vending-types.js";
import type { Content, FilterProps, ItemProps } from "../types.js";
export const Icon = Store;
const productLabel = (product: VendingProduct, t: Content) =>
  t[`vendProduct_${product}`];
export function Artwork({ t }: { t: Content }) {
  return (
    <div className="hero-art vend-art" aria-hidden="true">
      <svg className="vend-scene" viewBox="0 0 400 320" fill="none">
        <ellipse cx="205" cy="289" rx="143" ry="14" fill="#eed8c7" />
        <rect
          x="84"
          y="26"
          width="228"
          height="252"
          rx="20"
          fill="#ed8864"
          stroke="#602f25"
          strokeWidth="5"
        />
        <rect
          x="103"
          y="47"
          width="146"
          height="166"
          rx="9"
          fill="#fff4df"
          stroke="#602f25"
          strokeWidth="4"
        />
        {[77, 137].map((y) => (
          <g key={y}>
            {[118, 159, 200].map((x, i) => (
              <g key={x}>
                <rect
                  x={x + 6}
                  y={y - 10}
                  width="15"
                  height="9"
                  rx="2"
                  fill="#602f25"
                />
                <rect
                  x={x}
                  y={y}
                  width="28"
                  height="37"
                  rx="7"
                  fill={["#739e89", "#e9ba51", "#c47c91"][i]}
                  stroke="#602f25"
                  strokeWidth="2"
                />
                <path
                  d={`M${x + 6} ${y + 16}h16`}
                  stroke="#fff4df"
                  strokeWidth="5"
                />
              </g>
            ))}
            <path d={`M106 ${y + 45}h140`} stroke="#602f25" strokeWidth="4" />
          </g>
        ))}
        <rect x="262" y="57" width="32" height="26" rx="5" fill="#602f25" />
        <path d="M270 70h16" stroke="#cbe0b3" strokeWidth="4" />
        {[101, 122, 143].map((y) => (
          <g key={y}>
            <circle cx="270" cy={y} r="4" fill="#fff4df" />
            <circle cx="286" cy={y} r="4" fill="#fff4df" />
          </g>
        ))}
        <rect x="263" y="166" width="30" height="5" rx="2" fill="#602f25" />
        <rect x="112" y="229" width="128" height="30" rx="7" fill="#602f25" />
        <path d="M124 239h102" stroke="#bd7254" strokeWidth="3" />
        <path
          d="M108 280v9m179-9v9"
          stroke="#602f25"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <circle
          cx="326"
          cy="212"
          r="32"
          fill="#e9ba51"
          stroke="#602f25"
          strokeWidth="3"
        />
        <path
          d="M314 211l9 9 16-18"
          stroke="#602f25"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="art-caption">{t.sticker}</span>
    </div>
  );
}
export function Filters({
  t,
  product,
  onProduct,
  payment,
  onPayment,
  vendAccess,
  onVendAccess,
}: FilterProps) {
  return (
    <div className="vend-filters">
      <label>
        <span>{t.vendProduct}</span>
        <select
          value={product}
          onChange={(e) =>
            onProduct?.(e.target.value as VendingProduct | "all")
          }
        >
          <option value="all">{t.vendAnyProduct}</option>
          {VENDING_PRODUCTS.map((p) => (
            <option key={p} value={p}>
              {productLabel(p, t)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{t.vendPayment}</span>
        <select
          value={payment}
          onChange={(e) => onPayment?.(e.target.value as VendingPayment)}
        >
          <option value="all">{t.vendAnyPayment}</option>
          <option value="cash">{t.vendCash}</option>
          <option value="card">{t.vendCard}</option>
        </select>
      </label>
      <label>
        <span>{t.vendAccess}</span>
        <select
          value={vendAccess}
          onChange={(e) => onVendAccess?.(e.target.value as VendingAccess)}
        >
          <option value="all">{t.vendAnyAccess}</option>
          <option value="public">{t.vendPublic}</option>
        </select>
      </label>
    </div>
  );
}
export function Summary({ item, t }: ItemProps) {
  return (
    <span className="vend-summary">
      {item.vending?.groups.length
        ? item.vending.groups.map((p) => productLabel(p, t)).join(" · ")
        : t.vendUnknown}
    </span>
  );
}
export function DetailFields({ item, t }: ItemProps) {
  return (
    <>
      <div>
        <dt>{t.vendProduct}</dt>
        <dd>
          <Summary item={item} t={t} />
        </dd>
      </div>
      {!!item.vending?.products.length && (
        <div>
          <dt>{t.vendMappedProducts}</dt>
          <dd>{item.vending.products.join(", ")}</dd>
        </div>
      )}
      <div>
        <dt>{t.vendPayment}</dt>
        <dd>
          {item.vending?.payments.length
            ? item.vending.payments
                .map((p) => (p === "cash" ? t.vendCash : t.vendCard))
                .join(" · ")
            : t.vendPaymentUnknown}
        </dd>
      </div>
      <div>
        <dt>{t.details}</dt>
        <dd>{t.vendNote}</dd>
      </div>
    </>
  );
}
