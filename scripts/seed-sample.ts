import { createPool, migrate } from "../src/server/db.js";
import { importFile } from "../src/server/import-file.js";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { COUNTRIES, type CountryCode } from "../src/shared/countries.js";
const databaseUrl = process.env.DATABASE_URL;
if (
  process.env.NODE_ENV === "production" ||
  !databaseUrl ||
  !["localhost", "127.0.0.1", "[::1]"].includes(new URL(databaseUrl).hostname)
)
  throw new Error("Sample seed requires a local development database");
const pool = createPool(databaseUrl);
try {
  await migrate(pool);
  const count = Number((await pool.query("SELECT count(*) AS n FROM country_datasets")).rows[0].n);
  if (count)
    throw new Error(
      "Use a fresh development database; sample seeding will not replace an existing dataset",
    );
  const categoryFloors = [
    "TOILETS", "SELLERS", "KEBABS", "WATER_POINTS", "TRANSIT_STOPS", "CHARGE_STATIONS", "ATMS", "ACCOMMODATIONS", "SETTLEMENTS",
  ];
  for (const code of ["de", "ro", "at", "hu"] as const)
    for (const suffix of categoryFloors)
      process.env[`MIN_${code.toUpperCase()}_${suffix}`] = "1";

  const source = readFileSync("tests/fixtures/multi-site.jsonl", "utf8")
    .trimEnd().split("\n").map((line) => JSON.parse(line));
  const staging = mkdtempSync(join(tmpdir(), "bloli-country-sample-"));
  const cities: Record<CountryCode, { lat: number; lon: number; name: string }> = {
    de: { lat: 48.1391, lon: 11.4729, name: "München" },
    ro: { lat: 44.4268, lon: 26.1025, name: "București" },
    at: { lat: 48.2082, lon: 16.3738, name: "Wien" },
    hu: { lat: 47.4979, lon: 19.0402, name: "Budapest" },
  };
  const results = {};
  try {
    for (const code of ["de", "ro", "at", "hu"] as const) {
      const profile = COUNTRIES.find((country) => country.code === code)!;
      const city = cities[code];
      const prefix = { de: "9", ro: "8", at: "7", hu: "6" }[code];
      const rows = source.map((row: Record<string, any>) => {
        if (row.kind === "metadata")
          return {
            ...row,
            source: `synthetic-${code}-sample`,
            countryCode: code,
            sourceChecksum: "a".repeat(32),
            coverageSource: profile.boundaryUrl,
            coverageChecksum: "b".repeat(64),
            datasetAt: "2026-10-28T00:00:00Z",
            coverage: code === "de"
              ? { type: "MultiPolygon", coordinates: [[[[5,47],[16,47],[16,56],[5,56],[5,47]]]] }
              : { type: "MultiPolygon", coordinates: [[[[city.lon-0.1,city.lat-0.1],[city.lon+0.1,city.lat-0.1],[city.lon+0.1,city.lat+0.1],[city.lon-0.1,city.lat+0.1],[city.lon-0.1,city.lat-0.1]]]] },
          };
        if (row.kind === "complete") return { ...row };
        const originalId = Number(row.sourceId);
        const baseLat = 50;
        const baseLon = 11;
        return {
          ...row,
          sourceId: `${prefix}${originalId}`,
          version: 1,
          lat: code === "de" ? row.lat : city.lat + (row.lat-baseLat)*0.0001,
          lon: code === "de" ? row.lon : city.lon + (row.lon-baseLon)*0.0001,
          tags: Object.fromEntries(Object.entries(row.tags).map(([key, value]) => [
            key,
            code !== "de" && typeof value === "string"
              ? value.replaceAll("München", city.name).replaceAll("Bremen", city.name)
              : value,
          ])),
        };
      });
      if (code === "de" || code === "at") {
        rows.splice(rows.length - 1, 0, {
          kind: "facility",
          sourceType: "node",
          sourceId: "9900000",
          version: 5,
          lat: 47.5,
          lon: 10.5,
          tags: { amenity: "toilets", name: "Shared DE–AT border sample", fee: "no", opening_hours: "24/7" },
        });
        rows[rows.length - 1].records++;
      }
      if (code === "at") {
        rows[0].coverage = {
          type: "MultiPolygon",
          coordinates: [
            [[[city.lon-0.1,city.lat-0.1],[city.lon+0.1,city.lat-0.1],[city.lon+0.1,city.lat+0.1],[city.lon-0.1,city.lat+0.1],[city.lon-0.1,city.lat-0.1]]],
            [[[10.49,47.49],[10.51,47.49],[10.51,47.51],[10.49,47.51],[10.49,47.49]]],
          ],
        };
      }
      const file = join(staging, `${code}.jsonl`);
      writeFileSync(file, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
      results[code] = await importFile(pool, file);
    }
    await pool.query("UPDATE countries SET status='active' WHERE code IN ('de','ro','at','hu')");
    console.log(JSON.stringify({ synthetic: true, results }, null, 2));
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
} finally {
  await pool.end();
}
