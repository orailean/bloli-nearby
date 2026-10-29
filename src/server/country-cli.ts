import { createPool } from "./db.js";
import { COUNTRIES, type CountryCode } from "../shared/countries.js";
import { activateCountry, deactivateCountry } from "./country-activation.js";

const [action, rawCode] = process.argv.slice(2);
if (!(["activate", "deactivate"].includes(action)) || !rawCode || !COUNTRIES.some((c) => c.code === rawCode)) {
  throw new Error("Usage: country-cli.ts <activate|deactivate> <de|ro|at|hu>");
}
const code = rawCode as CountryCode;

const pool = createPool();
try {
  if (action === "activate") await activateCountry(pool, code);
  else await deactivateCountry(pool, code);
  const status = action === "activate" ? "active" : "pending";
  console.log(`${code.toUpperCase()} ${status}`);
} finally {
  await pool.end();
}
