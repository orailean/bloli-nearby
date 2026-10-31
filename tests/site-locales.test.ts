import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { siteDictionaries } from "../src/web/i18n.js";
for (const group of [
  "locales/common",
  "sites/loo/locales",
  "sites/kippe/locales",
  "sites/kebab/locales",
  "sites/water/locales",
  "sites/transit/locales",
  "sites/charge/locales",
  "sites/view/locales",
  "sites/sights/locales",
  "sites/vend/locales",
]) {
  test(`${group} has matching translated keys`, () => {
    const dictionaries = ["de", "en", "ro", "hu"].map((locale) =>
      JSON.parse(
        readFileSync(
          new URL(`../src/web/${group}/${locale}.json`, import.meta.url),
          "utf8",
        ),
      ),
    );
    for (const dict of dictionaries) {
      assert.deepEqual(
        Object.keys(dict).sort(),
        Object.keys(dictionaries[0]).sort(),
      );
      for (const value of Object.values(dict))
        assert.ok(typeof value === "string" && value.length);
    }
  });
}
test("Kippe includes availability wording and no toilet branding in site content", () => {
  for (const locale of ["en", "de", "ro"] as const) {
    assert.ok(siteDictionaries.kippe[locale].availability);
    assert.equal(siteDictionaries.kippe[locale].brandName, "kippe");
    assert.notEqual(
      siteDictionaries.kippe[locale].hero,
      siteDictionaries.loo[locale].hero,
    );
  }
});

test("Kebab has its own branding and mapped-hours wording in every locale", () => {
  for (const locale of ["en", "de", "ro"] as const) {
    const t = siteDictionaries.kebab[locale];
    assert.equal(t.brandName, "kebab");
    assert.doesNotMatch(
      t.skip + t.hero + t.intro + t.sourceHours + t.openNowHint,
      /WC|toilet|Tabak|24\/7|Automat/,
    );
    assert.notEqual(t.hero, siteDictionaries.loo[locale].hero);
    assert.notEqual(t.hero, siteDictionaries.kippe[locale].hero);
  }
});

test("Water keeps its identity and mapped facts in every locale", () => {
  for (const locale of ["de", "en", "ro"] as const) {
    const t = siteDictionaries.water[locale];
    assert.equal(t.brandName, "water");
    assert.ok(t.bottleSuitability);
    assert.notEqual(t.hero, siteDictionaries.loo[locale].hero);
  }
});

test("Transit retains mapped-service wording and all mode translations", () => {
  for (const locale of ["de", "en", "ro"] as const) {
    const t = siteDictionaries.transit[locale];
    assert.equal(t.brandName, "transit");
    assert.ok(t.mode_suburban_rail);
    assert.ok(t.referenceOnly);
    assert.notEqual(t.hero, siteDictionaries.water[locale].hero);
  }
});

test("Charge has independent mapped-only content and translated connector controls", () => {
  for (const lang of ["de", "en", "ro"] as const) {
    const t = siteDictionaries.charge[lang];
    assert.equal(t.brandName, "charge");
    assert.ok(t.connector_ccs && t.minimumPower && t.noLiveData);
    assert.notEqual(t.hero, siteDictionaries.transit[lang].hero);
  }
});
