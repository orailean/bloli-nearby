import type { Locale } from "../shared/types.js";
import type { SiteId } from "../shared/sites.js";
import commonEn from "./locales/common/en.json";
import commonDe from "./locales/common/de.json";
import commonRo from "./locales/common/ro.json";
import commonHu from "./locales/common/hu.json";
import looEn from "./sites/loo/locales/en.json";
import looDe from "./sites/loo/locales/de.json";
import looRo from "./sites/loo/locales/ro.json";
import looHu from "./sites/loo/locales/hu.json";
import kippeEn from "./sites/kippe/locales/en.json";
import kippeDe from "./sites/kippe/locales/de.json";
import kippeRo from "./sites/kippe/locales/ro.json";
import kippeHu from "./sites/kippe/locales/hu.json";
import kebabEn from "./sites/kebab/locales/en.json";
import kebabDe from "./sites/kebab/locales/de.json";
import kebabRo from "./sites/kebab/locales/ro.json";
import kebabHu from "./sites/kebab/locales/hu.json";
import waterEn from "./sites/water/locales/en.json";
import waterDe from "./sites/water/locales/de.json";
import waterRo from "./sites/water/locales/ro.json";
import waterHu from "./sites/water/locales/hu.json";
import transitEn from "./sites/transit/locales/en.json";
import transitDe from "./sites/transit/locales/de.json";
import transitRo from "./sites/transit/locales/ro.json";
import transitHu from "./sites/transit/locales/hu.json";
import chargeEn from "./sites/charge/locales/en.json";
import chargeDe from "./sites/charge/locales/de.json";
import chargeRo from "./sites/charge/locales/ro.json";
import chargeHu from "./sites/charge/locales/hu.json";
import atmEn from "./sites/atm/locales/en.json";
import atmDe from "./sites/atm/locales/de.json";
import atmRo from "./sites/atm/locales/ro.json";
import atmHu from "./sites/atm/locales/hu.json";
import stayEn from "./sites/stay/locales/en.json";
import stayDe from "./sites/stay/locales/de.json";
import stayRo from "./sites/stay/locales/ro.json";
import stayHu from "./sites/stay/locales/hu.json";
import viewEn from "./sites/view/locales/en.json";
import viewDe from "./sites/view/locales/de.json";
import viewRo from "./sites/view/locales/ro.json";
import viewHu from "./sites/view/locales/hu.json";
import sightsEn from "./sites/sights/locales/en.json";
import sightsDe from "./sites/sights/locales/de.json";
import sightsRo from "./sites/sights/locales/ro.json";
import sightsHu from "./sites/sights/locales/hu.json";
type Dictionary = Record<
  | keyof typeof commonEn
  | keyof typeof looEn
  | keyof typeof kippeEn
  | keyof typeof kebabEn
  | keyof typeof waterEn
  | keyof typeof transitEn
  | keyof typeof chargeEn
  | keyof typeof atmEn
  | keyof typeof stayEn
  | keyof typeof viewEn
  | keyof typeof sightsEn,
  string
>;
const common = { en: commonEn, de: commonDe, ro: commonRo, hu: commonHu };
const localized = {
  view: { en: viewEn, de: viewDe, ro: viewRo, hu: viewHu },
  sights: { en: sightsEn, de: sightsDe, ro: sightsRo, hu: sightsHu },
  loo: { en: looEn, de: looDe, ro: looRo, hu: looHu },
  kippe: { en: kippeEn, de: kippeDe, ro: kippeRo, hu: kippeHu },
  kebab: { en: kebabEn, de: kebabDe, ro: kebabRo, hu: kebabHu },
  water: { en: waterEn, de: waterDe, ro: waterRo, hu: waterHu },
  transit: { en: transitEn, de: transitDe, ro: transitRo, hu: transitHu },
  charge: { en: chargeEn, de: chargeDe, ro: chargeRo, hu: chargeHu },
  atm: { en: atmEn, de: atmDe, ro: atmRo, hu: atmHu },
  stay: { en: stayEn, de: stayDe, ro: stayRo, hu: stayHu },
};
const fallback = Object.assign(
  {},
  looDe,
  kippeDe,
  kebabDe,
  waterDe,
  transitDe,
  chargeDe,
  atmDe,
  stayDe,
  viewDe,
  sightsDe,
);
export const siteDictionaries = Object.fromEntries(
  Object.entries(localized).map(([id, content]) => [
    id,
    Object.fromEntries(
      (["en", "de", "ro", "hu"] as const).map((locale) => [
        locale,
        {
          ...fallback,
          ...commonDe,
          ...common[locale],
          ...content.de,
          ...content[locale],
        },
      ]),
    ),
  ]),
) as Record<SiteId, Record<Locale, Dictionary>>;
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
