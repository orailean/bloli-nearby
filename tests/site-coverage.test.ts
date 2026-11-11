import assert from "node:assert/strict";
import test from "node:test";
import { fillCountryCoverage, formatCountryList } from "../src/web/coverage.js";
import { siteDictionaries } from "../src/web/i18n.js";

test("site copy lists every active country with the locale conjunction", () => {
  assert.equal(
    formatCountryList(["Germany", "Romania"], "en"),
    "Germany and Romania",
  );
  assert.equal(
    formatCountryList(["Deutschland", "Rumänien", "Österreich"], "de"),
    "Deutschland, Rumänien und Österreich",
  );
  assert.equal(
    formatCountryList(["Germania", "România", "Austria"], "ro"),
    "Germania, România și Austria",
  );
});

test("site copy replaces the coverage token in intros and footers", () => {
  assert.equal(
    fillCountryCoverage(
      "Find chargers across {countries}.",
      ["Germany", "Romania"],
      "en",
    ),
    "Find chargers across Germany and Romania.",
  );
});

test("every site's introductions and footers stay country-neutral", () => {
 for (const dictionaries of Object.values(siteDictionaries)) {
  for (const locale of ["de","en","ro","hu","it"] as const) {
   const copy=dictionaries[locale];
   for (const text of [copy.intro,copy.footerText]) {
    assert.doesNotMatch(text,/\{countries\}|Germany|Deutschland|Germania|Németország/);
    assert.equal(fillCountryCoverage(text,["Italy"],locale),text);
   }
  }
 }
});
