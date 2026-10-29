import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { siteDictionaries, chooseLocale } from "../src/web/i18n.js";
import { formatCountryList } from "../src/web/coverage.js";
test("Hungarian dictionaries cover all common and site keys without losing placeholders", () => {
  for (const path of [
    "src/web/locales/common",
    ...Object.keys(siteDictionaries).map(
      (site) => `src/web/sites/${site}/locales`,
    ),
  ]) {
    const en = JSON.parse(readFileSync(`${path}/en.json`, "utf8")),
      hu = JSON.parse(readFileSync(`${path}/hu.json`, "utf8"));
    assert.deepEqual(Object.keys(hu).sort(), Object.keys(en).sort(), path);
    for (const key of Object.keys(en))
      assert.deepEqual(
        hu[key].match(/\{\w+\}/g) || [],
        en[key].match(/\{\w+\}/g) || [],
        `${path}/${key}`,
      );
  }
  assert.equal(chooseLocale(null, ["hu-HU"]), "hu");
  assert.equal(chooseLocale(null, ["fr-FR"]), "de");
  assert.equal(
    formatCountryList(["Németország", "Magyarország"], "hu"),
    "Németország és Magyarország",
  );
});
