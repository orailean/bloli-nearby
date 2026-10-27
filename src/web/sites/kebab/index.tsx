import { CreditCard, Utensils, ExternalLink } from "lucide-react";
import type { Content, ItemProps } from "../types.js";
export function Icon({
  size = 25,
  ...props
}: {
  size?: number;
  "aria-hidden"?: boolean | "true" | "false";
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" {...props}>
      <path
        d="M10 19 23 44 39 16"
        fill="#f6ba32"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M9 20c-5-11 8-17 12-10 5-12 18-7 17 4 9 2 6 10-1 10L9 24Z"
        fill="#21755c"
      />
      <path
        d="m14 21 8 3m3-9 10 6"
        stroke="#fff"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function Artwork({ t }: { t: Content }) {
  return (
    <div className="hero-art kebab-art" aria-hidden="true">
      <svg viewBox="0 0 400 320" className="kebab-counter" fill="none">
        <path
          d="M16 288h370"
          stroke="#402b52"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path d="M80 32h140v236H80z" fill="#f3eef6" />
        <path
          d="M93 45v173m23-173v173m23-173v173"
          stroke="#ded1e5"
          strokeWidth="6"
        />
        <path
          d="M171 15v258"
          stroke="#402b52"
          strokeWidth="8"
          strokeLinecap="round"
        />
        <g className="kebab-spit">
          <path
            d="m126 65 92-6-13 146-26 26-33-26Z"
            fill="#c67a42"
            stroke="#402b52"
            strokeWidth="4"
          />
          <path
            d="m130 86 83-9m-80 31 78-9m-75 32 72-10m-70 32 68-10m-65 32 62-10m-59 30 55-8"
            stroke="#f6ba32"
            strokeWidth="10"
            strokeLinecap="round"
          />
        </g>
        <path d="M136 269h70l15 19H122z" fill="#402b52" />
        <path
          d="m245 180 38 98 66-86"
          fill="#f6ba32"
          stroke="#402b52"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M247 194c-29-24-5-54 14-40 5-30 42-30 47-7 29-11 47 14 30 35 24 8 11 33-10 26"
          fill="#21755c"
        />
        <path
          d="m258 177 28 11m3-27 31 17m-49 27 25 9"
          stroke="#fff"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="m247 220 36 64 47-58-40 20z"
          fill="#fff"
          stroke="#402b52"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="m275 253 18 7"
          stroke="#1598a5"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      <span className="art-caption">{t.sticker}</span>
    </div>
  );
}
export function Filters() {
  return null;
}
export function Summary({ item, t }: ItemProps) {
  return (
    <span className="food-summary">
      <Utensils size={14} />
      {item.cuisine?.join(", ") || t.fallbackName}
    </span>
  );
}
function safeLink(value: string | null | undefined) {
  if (!value || /[\x00-\x20\x7f]/.test(value)) return null;
  try {
    const url = new URL(value);
    return /^(https?:)$/.test(url.protocol) && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function DetailFields({ item, t }: ItemProps) {
  const value = (v: string) => (v === "yes" ? t.yes : v === "no" ? t.no : v);
  const diet = Object.entries(item.dietary || {});
  const payment = Object.entries(item.paymentMethods || {});
  return (
    <>
      {item.cuisine?.length ? (
        <div>
          <dt>{t.cuisine}</dt>
          <dd>{item.cuisine.join(", ")}</dd>
        </div>
      ) : null}
      {(["takeaway", "delivery"] as const).map((key) =>
        item[key] ? (
          <div key={key}>
            <dt>{t[key]}</dt>
            <dd>{value(item[key]!)}</dd>
          </div>
        ) : null,
      )}
      {diet.length > 0 && (
        <div>
          <dt>{t.dietary}</dt>
          <dd>
            {diet.map(([key, v]) => (
              <span className="payment-entry" key={key}>
                {t[`diet_${key}` as keyof Content] || key.replaceAll("_", " ")}:{" "}
                {value(v)}
              </span>
            ))}
          </dd>
        </div>
      )}
      {payment.length > 0 && (
        <div>
          <dt>
            <CreditCard size={16} />
            {t.payment}
          </dt>
          <dd>
            {payment.map(([key, v]) => (
              <span className="payment-entry" key={key}>
                {t[`payment_${key}` as keyof Content] ||
                  key.replaceAll("_", " ")}
                : {value(v)}
              </span>
            ))}
          </dd>
        </div>
      )}
      {(["menuUrl", "website"] as const).map((key) => {
        const href = safeLink(item[key]);
        return href ? (
          <div key={key}>
            <dt>{t[key]}</dt>
            <dd>
              <a
                className="food-link"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t[key]}
                <ExternalLink size={14} />
              </a>
            </dd>
          </div>
        ) : null;
      })}
    </>
  );
}
