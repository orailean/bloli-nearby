export function formatCountryList(countries: readonly string[], locale: string) {
  if (countries.length < 2) return countries[0] ?? "";
  const conjunction = locale === "de" ? "und" : locale === "ro" ? "și" : "and";
  if (countries.length === 2)
    return `${countries[0]} ${conjunction} ${countries[1]}`;
  return `${countries.slice(0, -1).join(", ")} ${conjunction} ${countries.at(-1)}`;
}

export function fillCountryCoverage(copy: string, countries: readonly string[], locale: string) {
  return copy.replaceAll("{countries}", formatCountryList(countries, locale));
}
