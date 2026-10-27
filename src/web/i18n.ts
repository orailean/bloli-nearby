import type { Locale } from "../shared/types.js";
import commonEn from "./locales/common/en.json";
import commonDe from "./locales/common/de.json";
import commonRo from "./locales/common/ro.json";
import looEn from "./sites/loo/locales/en.json";
import looDe from "./sites/loo/locales/de.json";
import looRo from "./sites/loo/locales/ro.json";
import kippeEn from "./sites/kippe/locales/en.json";
import kippeDe from "./sites/kippe/locales/de.json";
import kippeRo from "./sites/kippe/locales/ro.json";
import type { SiteId } from "../shared/sites.js";
import kebabEn from "./sites/kebab/locales/en.json";
import kebabDe from "./sites/kebab/locales/de.json";
import kebabRo from "./sites/kebab/locales/ro.json";
import waterEn from "./sites/water/locales/en.json";
import waterDe from "./sites/water/locales/de.json";
import waterRo from "./sites/water/locales/ro.json";
import transitEn from "./sites/transit/locales/en.json";
import transitDe from "./sites/transit/locales/de.json";
import transitRo from "./sites/transit/locales/ro.json";
type Dictionary = Record<
  | keyof typeof commonEn
  | keyof typeof looEn
  | keyof typeof kebabEn
  | keyof typeof waterEn
  | keyof typeof transitEn,
  string
>;
// Food labels extend the shared presentation type; existing sites keep their own copy.
const foodFallback = Object.fromEntries(
  Object.entries(kebabDe).filter(
    ([key]) => !Object.hasOwn(commonDe, key) && !Object.hasOwn(looDe, key),
  ),
) as Pick<
  typeof kebabDe,
  Exclude<keyof typeof kebabDe, keyof typeof commonDe | keyof typeof looDe>
>;
const waterFallback = Object.fromEntries(
  Object.entries(waterDe).filter(
    ([key]) => !Object.hasOwn(commonDe, key) && !Object.hasOwn(looDe, key),
  ),
) as Pick<
  typeof waterDe,
  Exclude<keyof typeof waterDe, keyof typeof commonDe | keyof typeof looDe>
>;
const transitFallback = Object.fromEntries(
  Object.entries(transitDe).filter(
    ([key]) =>
      !Object.hasOwn(commonDe, key) &&
      !Object.hasOwn(looDe, key) &&
      !Object.hasOwn(kebabDe, key),
  ),
) as Pick<
  typeof transitDe,
  Exclude<
    keyof typeof transitDe,
    keyof typeof commonDe | keyof typeof looDe | keyof typeof kebabDe
  >
>;
export const siteDictionaries: Record<SiteId, Record<Locale, Dictionary>> = {
  transit: {
    en: {
      ...waterFallback,
      ...foodFallback,
      ...commonDe,
      ...commonEn,
      ...transitDe,
      ...transitEn,
    },
    de: { ...waterFallback, ...foodFallback, ...commonDe, ...transitDe },
    ro: {
      ...waterFallback,
      ...foodFallback,
      ...commonDe,
      ...commonRo,
      ...transitDe,
      ...transitRo,
    },
  },
  water: {
    en: {
      ...transitFallback,
      ...foodFallback,
      ...commonDe,
      ...commonEn,
      ...waterDe,
      ...waterEn,
    },
    de: { ...transitFallback, ...foodFallback, ...commonDe, ...waterDe },
    ro: {
      ...transitFallback,
      ...foodFallback,
      ...commonDe,
      ...commonRo,
      ...waterDe,
      ...waterRo,
    },
  },
  kebab: {
    en: {
      ...transitFallback,
      ...waterFallback,
      ...commonDe,
      ...commonEn,
      ...kebabDe,
      ...kebabEn,
    },
    de: { ...transitFallback, ...waterFallback, ...commonDe, ...kebabDe },
    ro: {
      ...transitFallback,
      ...waterFallback,
      ...commonDe,
      ...commonRo,
      ...kebabDe,
      ...kebabRo,
    },
  },
  loo: {
    en: {
      ...transitFallback,
      ...waterFallback,
      ...foodFallback,
      ...commonDe,
      ...commonEn,
      ...looDe,
      ...looEn,
    },
    de: {
      ...transitFallback,
      ...waterFallback,
      ...foodFallback,
      ...commonDe,
      ...looDe,
    },
    ro: {
      ...transitFallback,
      ...waterFallback,
      ...foodFallback,
      ...commonDe,
      ...commonRo,
      ...looDe,
      ...looRo,
    },
  },
  kippe: {
    en: {
      ...transitFallback,
      ...waterFallback,
      ...foodFallback,
      ...commonDe,
      ...commonEn,
      ...kippeDe,
      ...kippeEn,
    },
    de: {
      ...transitFallback,
      ...waterFallback,
      ...foodFallback,
      ...commonDe,
      ...kippeDe,
    },
    ro: {
      ...transitFallback,
      ...waterFallback,
      ...foodFallback,
      ...commonDe,
      ...commonRo,
      ...kippeDe,
      ...kippeRo,
    },
  },
};
export const dictionaries = siteDictionaries.loo;
export type TranslationKey = keyof Dictionary;
export function chooseLocale(
  saved: string | null,
  languages: readonly string[],
): Locale {
  if (saved && Object.hasOwn(dictionaries, saved)) return saved as Locale;
  for (const lang of languages) {
    const base = lang.toLowerCase().split("-")[0];
    if (Object.hasOwn(dictionaries, base)) return base as Locale;
  }
  return "de";
}
export function formatDistance(metres: number, locale: Locale) {
  return metres < 1000
    ? `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(metres)} m`
    : `${new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(metres / 1000)} km`;
}
export function formatCharge(charge: string, locale: Locale) {
  const match = charge.match(/^\s*(\d+(?:[.,]\d{1,2})?)\s*(?:EUR|€)\s*$/i);
  return match
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "EUR",
      }).format(Number(match[1].replace(",", ".")))
    : charge;
}
