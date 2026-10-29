import { categoryImports } from "./category-imports.js";
import type pg from "pg";
import { COUNTRIES, type CountryCode } from "../shared/countries.js";

export async function activateCountry(pool: pg.Pool, code: CountryCode) {
  if (code === "de") return;
  const predecessor = code === "hu" ? "at" : code === "at" ? "ro" : null;
  if (predecessor) {
    const prior = await pool.query(
      "SELECT status FROM countries WHERE code=$1",
      [predecessor],
    );
    if (prior.rows[0]?.status !== "active")
      throw new Error(
        `ROLLOUT_GATE_NOT_PASSED: ${predecessor.toUpperCase()} must be active first`,
      );
  }
  const result = await pool.query(
    `SELECT count(*)::int AS categories,
       bool_and(source_checksum IS NOT NULL AND boundary_checksum IS NOT NULL) AS verified
     FROM country_datasets WHERE country_code=$1`,
    [code],
  );
  if (
    result.rows[0].categories !== Object.keys(categoryImports).length ||
    !result.rows[0].verified
  )
    throw new Error("COUNTRY_SNAPSHOT_INCOMPLETE_OR_UNVERIFIED");
  await pool.query("UPDATE countries SET status='active' WHERE code=$1", [
    code,
  ]);
}

export async function deactivateCountry(pool: pg.Pool, code: CountryCode) {
  if (code === "de") throw new Error("GERMANY_MUST_REMAIN_ACTIVE");
  const downstream = code === "ro" ? ["at", "hu"] : code === "at" ? ["hu"] : [];
  if (downstream.length) {
    const active = await pool.query(
      "SELECT code FROM countries WHERE code=ANY($1::text[]) AND status='active' ORDER BY rollout_order DESC LIMIT 1",
      [downstream],
    );
    if (active.rowCount)
      throw new Error(
        `DEACTIVATE_DOWNSTREAM_COUNTRIES_FIRST: ${active.rows[0].code}`,
      );
  }
  await pool.query("UPDATE countries SET status='pending' WHERE code=$1", [
    code,
  ]);
}

export function countryCodeFrom(value: string | undefined): CountryCode {
  const country = COUNTRIES.find((entry) => entry.code === value);
  if (!country) throw new Error("UNKNOWN_COUNTRY");
  return country.code;
}
