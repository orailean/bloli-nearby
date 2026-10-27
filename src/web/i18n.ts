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
type Dictionary = Record<
  keyof typeof commonEn | keyof typeof looEn | keyof typeof kebabEn,
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
export const siteDictionaries: Record<SiteId, Record<Locale, Dictionary>> = {
  kebab: {
    en: { ...commonDe, ...commonEn, ...kebabDe, ...kebabEn },
    de: { ...commonDe, ...kebabDe },
    ro: { ...commonDe, ...commonRo, ...kebabDe, ...kebabRo },
  },
  loo: {
    en: { ...foodFallback, ...commonDe, ...commonEn, ...looDe, ...looEn },
    de: { ...foodFallback, ...commonDe, ...looDe },
    ro: { ...foodFallback, ...commonDe, ...commonRo, ...looDe, ...looRo },
  },
  kippe: {
    en: { ...foodFallback, ...commonDe, ...commonEn, ...kippeDe, ...kippeEn },
    de: { ...foodFallback, ...commonDe, ...kippeDe },
    ro: { ...foodFallback, ...commonDe, ...commonRo, ...kippeDe, ...kippeRo },
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
