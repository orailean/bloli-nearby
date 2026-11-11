import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { siteDictionaries, chooseLocale } from "../src/web/i18n.js";
import { formatCountryList } from "../src/web/coverage.js";
test("Italian dictionaries cover all common and site keys without losing placeholders", () => {
  for (const path of [
    "src/web/locales/common",
    ...Object.keys(siteDictionaries).map(
      (site) => `src/web/sites/${site}/locales`,
    ),
  ]) {
    const en = JSON.parse(readFileSync(`${path}/en.json`, "utf8")),
      it = JSON.parse(readFileSync(`${path}/it.json`, "utf8"));
    assert.deepEqual(Object.keys(it).sort(), Object.keys(en).sort(), path);
    for (const key of Object.keys(en))
      assert.deepEqual(
        it[key].match(/\{\w+\}/g) || [],
        en[key].match(/\{\w+\}/g) || [],
        `${path}/${key}`,
      );
  }
  assert.equal(chooseLocale(null, ["it-IT"]), "it");
  assert.equal(chooseLocale(null, ["fr-FR"]), "de");
  assert.equal(
    formatCountryList(["Germania", "Italia"], "it"),
    "Germania e Italia",
  );
});

// Generic UI copy must remain accurate as country coverage changes.
test("shared coverage labels are country-neutral in every language", () => {
 for (const lang of ["de","en","ro","hu","it"] as const) {
  const t=siteDictionaries.loo[lang];
  assert.doesNotMatch(t.germany + t.countryOnly, /Germany|Deutschland|Germania|Németország/);
 }
});
