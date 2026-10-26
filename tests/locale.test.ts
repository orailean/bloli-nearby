import test from "node:test";
import assert from "node:assert/strict";
import { chooseLocale, dictionaries, formatDistance } from "../src/web/i18n.js";
test("saved locale overrides browser preferences; regional matches preserve preference order", () => {
  assert.equal(chooseLocale("ro", ["de-DE"]), "ro");
  assert.equal(chooseLocale(null, ["fr-FR", "de-DE", "en-US"]), "de");
  assert.equal(chooseLocale("fr", ["ro-RO"]), "ro");
  assert.equal(chooseLocale(null, ["fr"]), "en");
});
test("all three languages cover states, errors, accessibility, and controls", () => {
  assert.deepEqual(
    Object.keys(dictionaries.de).sort(),
    Object.keys(dictionaries.en).sort(),
  );
  assert.deepEqual(
    Object.keys(dictionaries.ro).sort(),
    Object.keys(dictionaries.en).sort(),
  );
  assert.equal(dictionaries.ro.free, "Gratuite");
  assert.ok(dictionaries.de.DATA_NOT_READY);
  assert.ok(dictionaries.ro.language);
  assert.match(formatDistance(1250, "de"), /1,3/);
  assert.match(formatDistance(1250, "en"), /1.3/);
});

test("only supported own language keys are accepted", () => {
  assert.equal(chooseLocale("__proto__", ["ro-RO"]), "ro");
  assert.equal(chooseLocale("constructor", ["de-DE"]), "de");
});

test("simple EUR charges use locale formatting and descriptive charges stay verbatim", async () => {
  const { formatCharge } = await import("../src/web/i18n.js");
  assert.equal(formatCharge("0.50 EUR", "en"), "€0.50");
  assert.match(formatCharge("0.50 EUR", "de"), /0,50/);
  assert.equal(formatCharge("donation / 1-2 EUR", "ro"), "donation / 1-2 EUR");
});
