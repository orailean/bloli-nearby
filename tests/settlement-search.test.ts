import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSettlementSearch } from "../src/shared/settlement-search.js";

test("settlement search normalization matches accent-insensitive names", () => {
  assert.equal(normalizeSettlementSearch("München"), "munchen");
  assert.equal(normalizeSettlementSearch("București"), "bucuresti");
});

test("settlement search normalization expands common Latin ligatures", () => {
  assert.equal(normalizeSettlementSearch("Straße"), "strasse");
  assert.equal(normalizeSettlementSearch("Łódź"), "lodz");
});
