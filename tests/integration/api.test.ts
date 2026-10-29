import { analyzePublishedDataset } from "../../src/server/import-maintenance.js";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { importFile } from "../../src/server/import-file.js";
import { runRefresh } from "../../src/server/refresh.js";
import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { get as httpGet } from "node:http";
import { createPool, migrate } from "../../src/server/db.js";
import { importDataset } from "../../src/server/import.js";
import { activateCountry, deactivateCountry } from "../../src/server/country-activation.js";
import { createApi } from "../../src/server/api.js";
import type { Category } from "../../src/shared/sites.js";

const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error(
    "Set TEST_DATABASE_URL to an isolated PostGIS database (see README).",
  );
const pool = createPool(url);
const coverage = {
  type: "MultiPolygon",
  coordinates: [
    [
      [
        [5, 47],
        [16, 47],
        [16, 56],
        [5, 56],
        [5, 47],
      ],
    ],
  ],
};
const opts = {
  source: "test-fixture",
  datasetAt: "2026-10-25T00:00:00Z",
  coverage,
  minimumFacilities: 1,
  minimumSettlements: 1,
};
async function* records(count = 3) {
  for (let i = 0; i < count; i++)
    yield {
      kind: "facility",
      sourceType: "node",
      sourceId: String(i + 1),
      lat: 52.52,
      lon: 13.405 + i * 0.001,
      tags: {
        amenity: "toilets",
        name: `Test WC ${i + 1}`,
        ...(i === 0
          ? { opening_hours: "off" }
          : i === 1
            ? { opening_hours: "24/7" }
            : {}),
        ...(i === 0
          ? { fee: "no" }
          : i === 1
            ? { fee: "yes", charge: "0.50 EUR" }
            : {}),
      },
    };
  yield {
    kind: "settlement",
    sourceType: "node",
    sourceId: "100",
    lat: 52.52,
    lon: 13.405,
    tags: {
      place: "city",
      name: "Berlin",
      "addr:postcode": "10178",
      "is_in:state": "Berlin",
    },
  };
}
test(
  "PostGIS import and HTTP discovery contracts",
  { timeout: 30000 },
  async (t) => {
    await migrate(pool);
    const lookupIndexes = (
      await pool.query(
        "SELECT indexname FROM pg_indexes WHERE schemaname=current_schema() AND indexname=ANY($1::text[])",
        [[
          "settlement_search_name_prefix_idx",
          "country_settlement_membership_lookup_idx",
        ]],
      )
    ).rows.map((row) => row.indexname).sort();
    assert.deepEqual(lookupIndexes, [
      "country_settlement_membership_lookup_idx",
      "settlement_search_name_prefix_idx",
    ]);
    await pool.query(
      "TRUNCATE transit_components,country_location_memberships,country_settlement_memberships,country_datasets,location_categories,locations,category_datasets,facilities,settlements,dataset,import_jobs",
    );
    await pool.query("UPDATE countries SET status=CASE WHEN code='de' THEN 'active' ELSE 'pending' END");
    const server = createApi(pool);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address() as { port: number };
    const get = async (path: string) => {
      const r = await fetch(`http://127.0.0.1:${address.port}${path}`);
      return { status: r.status, body: await r.json() };
    };
    try {
      await t.test(
        "missing bootstrap is not an empty successful search",
        async () => {
          assert.equal((await get("/api/ready")).status, 503);
          assert.equal(
            (await get("/api/toilets?lat=52.52&lon=13.405")).body.error,
            "DATA_NOT_READY",
          );
        },
      );
      await t.test(
        "import activates local data and preserves unknown fees",
        async () => {
          await importDataset(pool, records(), opts);
          const r = await get("/api/toilets?lat=52.52&lon=13.405");
          assert.equal(r.status, 200);
          assert.equal(r.body.items.length, 3);
          assert.deepEqual(
            r.body.items.map((x: { fee: string }) => x.fee),
            ["free", "paid", "unknown"],
          );
          assert.equal(r.body.items[0].distance, 0);
          assert.equal(r.body.dataset.source, "test-fixture");
          const status = await get("/api/status");
          assert.equal(status.body.countries.find((c: any) => c.code === "de").status, "active");
          assert.equal(status.body.countries.find((c: any) => c.code === "de").ready, true);
          assert.equal((await get("/api/ready")).status, 200);
        },
      );
      await t.test(
        "filters, stable ordering, truncation, and metre radius",
        async () => {
          assert.equal(
            (await get("/api/toilets?lat=52.52&lon=13.405&fee=free")).body.items
              .length,
            1,
          );
          assert.equal(
            (await get("/api/toilets?lat=52.52&lon=13.405&fee=paid")).body
              .items[0].id,
            "node/2",
          );
          const capped = await get("/api/toilets?lat=52.52&lon=13.405&limit=1");
          assert.equal(capped.body.items.length, 1);
          assert.equal(capped.body.truncated, true);
          assert.equal(
            (await get("/api/toilets?lat=52.52&lon=13.405&radius=1")).body.items
              .length,
            1,
          );
          const empty = await get("/api/toilets?lat=53&lon=13&radius=1");
          assert.deepEqual(empty.body.items, []);
        },
      );
      await t.test(
        "open now filters before limiting and preserves fee/radius constraints",
        async () => {
          const r = await get(
            "/api/toilets?lat=52.52&lon=13.405&openNow=true&limit=1",
          );
          assert.equal(r.status, 200);
          assert.deepEqual(
            r.body.items.map((item: { id: string }) => item.id),
            ["node/2"],
          );
          assert.equal(r.body.truncated, false);
          assert.deepEqual(
            (
              await get(
                "/api/toilets?lat=52.52&lon=13.405&openNow=true&fee=free",
              )
            ).body.items,
            [],
          );
          assert.deepEqual(
            (
              await get(
                "/api/toilets?lat=52.52&lon=13.405&openNow=true&radius=1",
              )
            ).body.items,
            [],
          );
          assert.equal(
            (await get("/api/toilets?lat=52.52&lon=13.405&openNow=maybe"))
              .status,
            400,
          );
        },
      );
      await t.test("query validation and country coverage", async () => {
        for (const query of [
          "lat=&lon=13",
          "lat=52&lon=13&radius=5001",
          "lat=52&lon=13&fee=unknown",
        ])
          assert.equal((await get(`/api/toilets?${query}`)).status, 400);
        assert.equal(
          (await get("/api/toilets?lat=48.85&lon=2.35")).body.error,
          "OUTSIDE_COVERAGE",
        );
        assert.equal(
          (await get("/api/settlements?q=10178")).body.items[0].name,
          "Berlin",
        );
        assert.equal(
          (await get("/api/settlements?q=ber")).body.items[0].postcode,
          "10178",
        );
      });
      await t.test(
        "repeat imports deduplicate and a failed refresh retains the previous data",
        async () => {
          async function* duplicates() {
            yield* records();
            yield* records();
          }
          await importDataset(pool, duplicates(), opts);
          assert.equal(
            (await pool.query("SELECT count(*) FROM facilities")).rows[0].count,
            "3",
          );
          async function* broken() {
            yield* records(1);
            throw new Error("interrupted");
          }
          await assert.rejects(
            importDataset(pool, broken(), opts),
            /interrupted/,
          );
          assert.equal(
            (await pool.query("SELECT count(*) FROM facilities")).rows[0].count,
            "3",
          );
          assert.equal(
            (
              await pool.query(
                "SELECT status FROM import_jobs ORDER BY id DESC LIMIT 1",
              )
            ).rows[0].status,
            "failed",
          );
          await assert.rejects(
            importDataset(pool, records(1), { ...opts, minimumRatio: 0.8 }),
            /SUSPICIOUS/,
          );
          assert.equal(
            (await pool.query("SELECT count(*) FROM facilities")).rows[0].count,
            "3",
          );
        },
      );
      await t.test(
        "concurrent importer cannot replace a locked dataset",
        async () => {
          const lock = await pool.connect();
          await lock.query("SELECT pg_advisory_lock(194159)");
          try {
            await assert.rejects(
              importDataset(pool, records(), opts),
              /IMPORT_LOCKED/,
            );
          } finally {
            await lock.query("SELECT pg_advisory_unlock(194159)");
            lock.release();
          }
        },
      );
      await t.test(
        "whole refresh records download failures and reconciles abandoned jobs",
        async () => {
          await assert.rejects(
            runRefresh(pool, "download-test", async () => {
              throw new Error("DOWNLOAD_FAILED");
            }),
            /DOWNLOAD_FAILED/,
          );
          const failed = (
            await pool.query(
              "SELECT status FROM import_jobs WHERE source='download-test' ORDER BY id DESC LIMIT 1",
            )
          ).rows[0];
          assert.equal(failed.status, "failed");
          const abandoned = (
            await pool.query(
              "INSERT INTO import_jobs(status,source) VALUES('running','interrupted-test') RETURNING id",
            )
          ).rows[0].id;
          await importDataset(pool, records(), opts);
          assert.equal(
            (
              await pool.query("SELECT status FROM import_jobs WHERE id=$1", [
                abandoned,
              ])
            ).rows[0].status,
            "failed",
          );
        },
      );
      await t.test(
        "ambiguous settlements include nearest city context",
        async () => {
          async function* withContext() {
            yield* records();
            for (const [id, name, place, lat, lon] of [
              ["201", "Bremen", "city", 53.08, 8.8],
              ["202", "Bremerhaven", "city", 53.54, 8.58],
              ["203", "Lehe", "suburb", 53.1, 8.83],
              ["204", "Lehe", "suburb", 53.57, 8.6],
            ] as const)
              yield {
                kind: "settlement",
                sourceType: "node",
                sourceId: id,
                lat,
                lon,
                tags: { name, place },
              };
          }
          await importDataset(pool, withContext(), opts);
          const matches = (await get("/api/settlements?q=Lehe")).body.items;
          assert.deepEqual(
            matches.map((x: { nearCity: string }) => x.nearCity),
            ["Bremen", "Bremerhaven"],
          );
        },
      );
      await t.test(
        "two hosts isolate categories, filters and metadata and retain failed snapshots",
        async () => {
          const byHost = async (host: string, path: string) => {
            return new Promise<{ status: number; body: any }>(
              (resolve, reject) => {
                httpGet(
                  `http://127.0.0.1:${address.port}${path}`,
                  { headers: { Host: host } },
                  (response) => {
                    let body = "";
                    response.on("data", (chunk) => (body += chunk));
                    response.on("end", () =>
                      resolve({
                        status: response.statusCode!,
                        body: JSON.parse(body),
                      }),
                    );
                  },
                ).on("error", reject);
              },
            );
          };
          assert.equal(
            (await byHost("kippe.bloli.com", "/api/status")).body.ready,
            false,
          );
          async function* mixed() {
            yield* records();
            for (let i = 0; i < 4; i++)
              yield {
                kind: "settlement",
                sourceType: "node",
                sourceId: String(700 + i),
                lat: 52.52,
                lon: 13.405,
                tags: { place: "village", name: `Fixture ${i}` },
              };
            for (const [id, tags] of [
              ["1", { shop: "tobacco", opening_hours: "24/7" }],
              [
                "501",
                {
                  amenity: "vending_machine",
                  vending: "cigarettes",
                  opening_hours: "off",
                },
              ],
              [
                "502",
                { amenity: "fuel", tobacco: "yes", opening_hours: "24/7" },
              ],
              ["503", { amenity: "vending_machine", vending: "cigarettes" }],
              ["504", { amenity: "fuel" }],
            ] as const)
              yield {
                kind: "seller",
                sourceType: "node",
                sourceId: id,
                lat: 52.52,
                lon: 13.405,
                tags,
              };
          }
          const multiOpts = {
            ...opts,
            categories: ["toilets", "tobacco"] as Array<"toilets" | "tobacco">,
            minimumSellers: 1,
            minimumRatio: 0.5,
          };
          await importDataset(pool, mixed(), multiOpts);
          for (const host of ["loo.bloli.com", "kippe.bloli.com"]) {
            const profile = await byHost(host, "/api/site");
            assert.equal(profile.status, 200);
            assert.equal(profile.body.id, host.split(".")[0]);
            assert.equal((await byHost(host, "/api/status")).body.ready, true);
          }
          assert.equal(
            (
              await byHost(
                "kippe.bloli.com",
                "/api/locations?lat=52.52&lon=13.405",
              )
            ).body.items.length,
            5,
          );
          assert.equal(
            (
              await byHost(
                "loo.bloli.com",
                "/api/locations?lat=52.52&lon=13.405",
              )
            ).body.items.length,
            3,
          );
          const machines = await byHost(
            "kippe.bloli.com",
            "/api/locations?lat=52.52&lon=13.405&sellerType=machine",
          );
          assert.equal(machines.body.items[0].id, "node/501");
          assert.equal(machines.body.items.length, 2);
          assert.equal(
            machines.body.items.find((item: any) => item.id === "node/503")
              .hoursAssumed,
            true,
          );
          await pool.query(
            "UPDATE location_categories SET data=data-'openingHours'-'hoursAssumed' WHERE category='tobacco' AND location_id='node/503'",
          );
          const assumedOpen = await byHost(
            "kippe.bloli.com",
            "/api/locations?lat=52.52&lon=13.405&sellerType=machine&openNow=true",
          );
          assert.deepEqual(
            assumedOpen.body.items.map((item: any) => item.id),
            ["node/503"],
          );
          assert.equal(assumedOpen.body.items[0].hoursAssumed, true);
          const fuel = await byHost(
            "kippe.bloli.com",
            "/api/locations?lat=52.52&lon=13.405&sellerType=fuel",
          );
          assert.equal(
            fuel.body.items.find((item: any) => item.id === "node/504")
              .tobaccoSales,
            "unconfirmed",
          );
          const open = await byHost(
            "kippe.bloli.com",
            "/api/locations?lat=52.52&lon=13.405&openNow=true&limit=1",
          );
          assert.equal(open.body.items.length, 1);
          assert.equal(open.body.truncated, true);
          assert.equal(
            (
              await byHost(
                "kippe.bloli.com",
                "/api/toilets?lat=52.52&lon=13.405",
              )
            ).status,
            404,
          );
          for (const path of [
            "/api/locations?lat=52.52&lon=13.405&fee=all",
            "/api/locations?lat=52.52&lon=13.405&category=toilets",
          ])
            assert.equal((await byHost("kippe.bloli.com", path)).status, 400);
          assert.equal(
            (await byHost("untrusted.example", "/api/site")).status,
            421,
          );
          assert.equal(
            (
              await byHost(
                "loo.bloli.com",
                "/api/locations?lat=52.52&lon=13.405&sellerType=machine",
              )
            ).status,
            400,
          );
          assert.equal(
            (
              await pool.query(
                "SELECT count(*)::int AS n FROM location_categories WHERE location_id='node/1'",
              )
            ).rows[0].n,
            2,
          );
          await assert.rejects(
            importDataset(pool, records(), opts),
            (error: any) => error.code === "PARTIAL_CATEGORY_IMPORT",
          );
          await assert.rejects(
            importDataset(pool, mixed(), { ...multiOpts, minimumSellers: 999 }),
          );
          assert.equal(
            (await byHost("kippe.bloli.com", "/api/status")).body.count,
            5,
          );
          assert.equal(
            (await byHost("loo.bloli.com", "/api/status")).body.count,
            3,
          );
          await importDataset(pool, mixed(), multiOpts);
          assert.equal(
            (
              await pool.query(
                "SELECT count(*)::int AS n FROM location_categories WHERE category='tobacco'",
              )
            ).rows[0].n,
            5,
          );
        },
      );
      await t.test(
        "third category publishes coherently and rejects incomplete or invalid replacements",
        async () => {
          const byHost = (host: string, path: string) =>
            new Promise<{ status: number; body: any }>((resolve, reject) => {
              httpGet(
                `http://127.0.0.1:${address.port}${path}`,
                { headers: { Host: host } },
                (response) => {
                  let body = "";
                  response.on("data", (chunk) => (body += chunk));
                  response.on("end", () =>
                    resolve({
                      status: response.statusCode!,
                      body: JSON.parse(body),
                    }),
                  );
                },
              ).on("error", reject);
            });
          const shared = {
            amenity: "fast_food",
            cuisine: "pizza;kebab",
            shop: "kiosk",
            toilets: "yes",
            "toilets:access": "public",
            opening_hours: "off",
          };
          async function* triple(includeFood = true) {
            for await (const row of records())
              yield row.sourceId === "1" ? { ...row, tags: shared } : row;
            for (let i = 0; i < 4; i++)
              yield {
                kind: "settlement",
                sourceType: "node",
                sourceId: String(700 + i),
                lat: 52.52,
                lon: 13.405,
                tags: { place: "village", name: `Fixture ${i}` },
              };
            for (const id of ["1", "501", "502", "503", "504"])
              yield {
                kind: "seller",
                sourceType: "node",
                sourceId: id,
                lat: 52.52,
                lon: 13.405,
                tags: id === "1" ? shared : { shop: "tobacco" },
              };
            if (includeFood)
              for (const id of ["1", "801", "802", "803"])
                yield {
                  kind: "kebab",
                  sourceType: "node",
                  sourceId: id,
                  lat: 52.52,
                  lon: 13.405,
                  tags:
                    id === "1"
                      ? shared
                      : {
                          amenity: "fast_food",
                          cuisine: "kebab",
                          ...(id === "803"
                            ? { opening_hours: "24/7" }
                            : id === "802"
                              ? { opening_hours: "off" }
                              : {}),
                          website: "javascript:alert(1)",
                        },
                };
          }
          const options = {
            ...opts,
            categories: ["toilets", "tobacco", "kebab"] as Array<
              "toilets" | "tobacco" | "kebab"
            >,
            minimumSellers: 1,
            minimumKebabs: 1,
          };
          assert.equal(
            (await byHost("kebab.bloli.com", "/api/ready")).status,
            503,
          );
          const counts = await importDataset(pool, triple(), options);
          assert.equal(counts.kebabs, 4);
          await migrate(pool);
          await migrate(pool);
          assert.equal(
            (await byHost("kebab.bloli.com", "/api/ready")).body.count,
            4,
          );
          const all = await byHost(
            "kebab.bloli.com",
            "/api/locations?lat=52.52&lon=13.405",
          );
          assert.equal(all.status, 200);
          assert.equal(all.body.items.length, 4);
          assert.ok(
            all.body.items.every(
              (x: any) => x.category === "kebab" && !x.sellerType,
            ),
          );
          assert.ok(all.body.items.every((x: any) => !x.hoursAssumed));
          const opened = await byHost(
            "kebab.bloli.com",
            "/api/locations?lat=52.52&lon=13.405&openNow=true&limit=1",
          );
          assert.deepEqual(
            opened.body.items.map((x: any) => x.id),
            ["node/803"],
          );
          assert.equal(opened.body.items[0].website, null);
          for (const suffix of [
            "&fee=all",
            "&sellerType=all",
            "&category=toilets",
          ])
            assert.equal(
              (
                await byHost(
                  "kebab.bloli.com",
                  "/api/locations?lat=52.52&lon=13.405" + suffix,
                )
              ).status,
              400,
            );
          assert.equal(
            (
              await byHost(
                "kebab.bloli.com",
                "/api/toilets?lat=52.52&lon=13.405",
              )
            ).status,
            404,
          );
          assert.equal(
            (
              await pool.query(
                "SELECT count(*)::int n FROM location_categories WHERE location_id='node/1'",
              )
            ).rows[0].n,
            3,
          );
          async function* conflictingGeometry() {
            for await (const row of triple())
              yield row.kind === "kebab" && row.sourceId === "1"
                ? { ...row, lon: 13.41 }
                : row;
          }
          await assert.rejects(
            importDataset(pool, conflictingGeometry(), options),
            (e: any) => e.code === "INCONSISTENT_SOURCE_GEOMETRY",
          );
          const before = (
            await pool.query(
              "SELECT category,location_count,imported_at FROM category_datasets ORDER BY category",
            )
          ).rows;
          await assert.rejects(
            importDataset(pool, triple(false), {
              ...options,
              categories: ["toilets", "tobacco"],
            }),
            (e: any) => e.code === "PARTIAL_CATEGORY_IMPORT",
          );
          for (const overrides of [
            { minimumKebabs: 99 },
            { minimumKebabs: NaN },
            { minimumKebabs: Infinity },
            { minimumRatio: NaN },
            { datasetAt: "2026-10-24T00:00:00Z" },
          ])
            await assert.rejects(
              importDataset(pool, triple(), { ...options, ...overrides }),
            );
          await assert.rejects(
            importDataset(pool, triple(), {
              ...options,
              categories: ["toilets", "kebab", "kebab"],
            }),
            (e: any) => e.code === "INVALID_CATEGORIES",
          );
          await assert.rejects(importDataset(pool, triple(false), options));
          assert.deepEqual(
            (
              await pool.query(
                "SELECT category,location_count,imported_at FROM category_datasets ORDER BY category",
              )
            ).rows,
            before,
          );
          const directory = await mkdtemp(join(tmpdir(), "bloli-incomplete-"));
          const path = join(directory, "incomplete.jsonl");
          const lines = [JSON.stringify({ kind: "metadata", ...options })];
          for await (const row of triple()) lines.push(JSON.stringify(row));
          const priorEnv = {
            fac: process.env.MIN_FACILITIES,
            sett: process.env.MIN_SETTLEMENTS,
            sell: process.env.MIN_SELLERS,
            food: process.env.MIN_KEBABS,
          };
          try {
            await writeFile(path, lines.join("\n") + "\n");
            process.env.MIN_FACILITIES = "1";
            process.env.MIN_SETTLEMENTS = "1";
            process.env.MIN_SELLERS = "1";
            process.env.MIN_KEBABS = "1";
            await assert.rejects(importFile(pool, path), /INCOMPLETE_IMPORT/);
            assert.deepEqual(
              (
                await pool.query(
                  "SELECT category,location_count,imported_at FROM category_datasets ORDER BY category",
                )
              ).rows,
              before,
            );
          } finally {
            for (const [key, value] of Object.entries({
              MIN_FACILITIES: priorEnv.fac,
              MIN_SETTLEMENTS: priorEnv.sett,
              MIN_SELLERS: priorEnv.sell,
              MIN_KEBABS: priorEnv.food,
            }))
              if (value === undefined) delete process.env[key];
              else process.env[key] = value;
            await rm(directory, { recursive: true, force: true });
          }
          await importDataset(pool, triple(), options);
          assert.equal(
            (
              await pool.query(
                "SELECT count(*)::int n FROM location_categories WHERE category='kebab'",
              )
            ).rows[0].n,
            4,
          );
        },
      );
      await t.test(
        "Water fourth category publishes atomically and preserves prior categories",
        async () => {
          const options = {
            ...opts,
            categories: ["toilets", "tobacco", "kebab", "water"] as const,
            minimumSellers: 1,
            minimumKebabs: 1,
            minimumWaterPoints: 1,
            minimumRatio: 0.5,
          };
          async function* four() {
            yield* records();
            for (let i = 0; i < 4; i++) {
              yield {
                kind: "seller",
                sourceType: "node",
                sourceId: String(900 + i),
                lat: 52.52,
                lon: 13.405,
                tags: { shop: "tobacco" },
              };
              yield {
                kind: "kebab",
                sourceType: "node",
                sourceId: String(910 + i),
                lat: 52.52,
                lon: 13.405,
                tags: { amenity: "fast_food", cuisine: "kebab" },
              };
              yield {
                kind: "water",
                sourceType: "node",
                sourceId: String(920 + i),
                lat: 52.52,
                lon: 13.405 + i * 0.0001,
                tags: {
                  amenity: "drinking_water",
                  fee: i === 0 ? "no" : "yes",
                  opening_hours: "24/7",
                  ...(i === 0 ? { seasonal: "yes" } : {}),
                },
              };
              yield {
                kind: "settlement",
                sourceType: "node",
                sourceId: String(930 + i),
                lat: 52.52,
                lon: 13.405,
                tags: { name: `Water fixture ${i}`, place: "village" },
              };
            }
          }
          const runOptions = {
            ...options,
            categories: [...options.categories],
          };
          const result = await importDataset(pool, four(), runOptions);
          assert.equal(result.waterPoints, 4);
          await migrate(pool);
          await migrate(pool);
          const request = (path: string) =>
            new Promise<{ status: number; body: any }>((resolve, reject) => {
              httpGet(
                `http://127.0.0.1:${address.port}${path}`,
                { headers: { Host: "water.bloli.com" } },
                (r) => {
                  let data = "";
                  r.on("data", (chunk) => (data += chunk));
                  r.on("end", () =>
                    resolve({ status: r.statusCode!, body: JSON.parse(data) }),
                  );
                },
              ).on("error", reject);
            });
          assert.equal((await request("/api/ready")).body.count, 4);
          const all = await request("/api/locations?lat=52.52&lon=13.405");
          assert.equal(all.body.items.length, 4);
          assert.ok(all.body.items.every((x: any) => x.category === "water"));
          assert.equal(
            (await request("/api/locations?lat=52.52&lon=13.405&fee=free")).body
              .items.length,
            1,
          );
          assert.equal(
            (await request("/api/locations?lat=52.52&lon=13.405&openNow=true"))
              .body.items.length,
            3,
          );
          assert.equal(
            (
              await request(
                "/api/locations?lat=52.52&lon=13.405&sellerType=all",
              )
            ).status,
            400,
          );
          assert.equal(
            (
              await request(
                "/api/locations?lat=52.52&lon=13.405&category=tobacco",
              )
            ).status,
            400,
          );
          const before = (
            await pool.query(
              "SELECT category,location_count,imported_at FROM category_datasets ORDER BY category",
            )
          ).rows;
          await assert.rejects(
            importDataset(pool, four(), {
              ...runOptions,
              minimumWaterPoints: 99,
            }),
          );
          await assert.rejects(
            importDataset(pool, records(), {
              ...opts,
              categories: ["toilets", "tobacco", "kebab"],
            }),
            (e: any) => e.code === "PARTIAL_CATEGORY_IMPORT",
          );
          assert.deepEqual(
            (
              await pool.query(
                "SELECT category,location_count,imported_at FROM category_datasets ORDER BY category",
              )
            ).rows,
            before,
          );
        },
      );
      await t.test(
        "Transit groups before limit and selects mode-specific boarding points",
        async () => {
          const saved = (
            await pool.query("SELECT category,data FROM location_categories")
          ).rows;
          const opts5 = {
            ...opts,
            categories: [
              "toilets",
              "tobacco",
              "kebab",
              "water",
              "transit",
            ] as any,
            minimumSellers: 1,
            minimumKebabs: 1,
            minimumWaterPoints: 1,
            minimumTransit: 1,
          };
          const group = {
            id: "relation/10001",
            tags: { name: "Interchange" },
            routes: [],
          };
          const tr = (
            id: string,
            lon: number,
            tags: Record<string, string>,
            groups: any[] = [group],
          ) => ({
            kind: "transit",
            sourceType: "node",
            sourceId: id,
            lat: 52.52,
            lon,
            tags,
            transport: { groups, routes: [] },
          });
          async function* five() {
            for (const x of saved)
              yield {
                kind: (
                  {
                    toilets: "facility",
                    tobacco: "seller",
                    kebab: "kebab",
                    water: "water",
                  } as any
                )[x.category],
                sourceType: x.data.sourceType,
                sourceId: x.data.sourceId,
                lat: x.data.lat,
                lon: x.data.lon,
                tags: x.data.tags,
              };
            for (let i = 0; i < 5; i++)
              yield {
                kind: "settlement",
                sourceType: "node",
                sourceId: String(20000 + i),
                lat: 52.52,
                lon: 13.405,
                tags: { name: "Fixture", place: "city" },
              };
            yield tr("10001", 13.405, { railway: "station", subway: "yes" });
            yield tr("10002", 13.415, {
              public_transport: "platform",
              subway: "yes",
              local_ref: "U1",
            });
            yield tr("10003", 13.406, {
              railway: "subway_entrance",
              subway: "yes",
              wheelchair: "yes",
            });
            yield tr("10004", 13.407, {
              public_transport: "platform",
              bus: "yes",
              local_ref: "Bus A",
            });
            yield tr("10005", 13.405, {
              public_transport: "stop_position",
              subway: "yes",
            });
            yield tr(
              "10006",
              13.4055,
              { amenity: "taxi", name: "Interchange" },
              [],
            );
            yield tr(
              "10007",
              13.4056,
              { public_transport: "stop_position", train: "yes" },
              [],
            );
          }
          await importDataset(pool, five(), opts5);
          await migrate(pool);
          const req = (query: string) =>
            new Promise<any>((resolve, reject) => {
              httpGet(
                `http://127.0.0.1:${address.port}/api/locations?lat=52.52&lon=13.405&${query}`,
                { headers: { Host: "transit.bloli.com" } },
                (r) => {
                  let b = "";
                  r.on("data", (c) => (b += c));
                  r.on("end", () =>
                    resolve({ status: r.statusCode, body: JSON.parse(b) }),
                  );
                },
              ).on("error", reject);
            });
          const sub = await req("radius=500&mode=subway");
          assert.equal(sub.status, 200);
          assert.equal(sub.body.items.length, 1);
          assert.equal(sub.body.items[0].id, "relation/10001");
          assert.equal(sub.body.items[0].transit.componentId, "node/10003");
          assert.ok(sub.body.items[0].distance > 50);
          assert.equal(sub.body.items[0].lon, 13.406);
          const bus = await req("mode=bus");
          assert.equal(bus.body.items[0].transit.componentId, "node/10004");
          const all = await req("limit=1");
          assert.equal(all.body.items.length, 1);
          assert.equal(all.body.truncated, true);
          const pos = await req("mode=train");
          assert.equal(pos.body.items[0].transit.directionsAvailable, false);
          for (const query of [
            "openNow=false",
            "fee=all",
            "sellerType=all",
            "mode=bad",
          ])
            assert.equal((await req(query)).status, 400);
          const before = (
            await pool.query(
              "SELECT * FROM transit_components ORDER BY location_id",
            )
          ).rows;
          await assert.rejects(
            importDataset(pool, five(), { ...opts5, minimumTransit: 999 }),
          );
          assert.deepEqual(
            (
              await pool.query(
                "SELECT * FROM transit_components ORDER BY location_id",
              )
            ).rows,
            before,
          );
        },
      );
      await t.test(
        "Charge filters connector-local power/access before cap and publishes six categories",
        async () => {
          const prior = (
            await pool.query(
              "SELECT category,data FROM location_categories ORDER BY category,location_id",
            )
          ).rows;
          const beforeCounts = (
            await pool.query(
              "SELECT category,location_count FROM category_datasets ORDER BY category",
            )
          ).rows;
          const opts6 = {
            ...opts,
            categories: [
              "toilets",
              "tobacco",
              "kebab",
              "water",
              "transit",
              "charge",
            ] as any,
            minimumSellers: 1,
            minimumKebabs: 1,
            minimumWaterPoints: 1,
            minimumTransit: 1,
            minimumChargeStations: 1,
          };
          async function* six() {
            for (const row of prior)
              yield {
                kind: (
                  {
                    toilets: "facility",
                    tobacco: "seller",
                    kebab: "kebab",
                    water: "water",
                    transit: "transit",
                  } as any
                )[row.category],
                sourceType: row.data.sourceType,
                sourceId: row.data.sourceId,
                lat: row.data.lat,
                lon: row.data.lon,
                tags: row.data.tags,
                ...(row.category === "transit"
                  ? {
                      transport: {
                        groups: row.data.transit.groupId
                          ? [
                              {
                                id: row.data.transit.groupId,
                                tags: {
                                  name: row.data.transit.groupName || "Fixture",
                                },
                                routes: row.data.transit.groupRoutes || [],
                              },
                            ]
                          : [],
                        routes: row.data.transit.routes || [],
                      },
                    }
                  : {}),
              };
            for (let i = 0; i < 5; i++)
              yield {
                kind: "settlement",
                sourceType: "node",
                sourceId: String(40000 + i),
                lat: 52.52,
                lon: 13.405,
                tags: { place: "city", name: "Fixture" },
              };
            for (let i = 0; i < 125; i++)
              yield {
                kind: "charge",
                sourceType: "node",
                sourceId: String(30000 + i),
                lat: 52.52,
                lon: 13.405 + i * 0.00001,
                tags: {
                  amenity: "charging_station",
                  access: "yes",
                  "socket:type2": "2",
                  "socket:type2:output": "22 kW",
                  "socket:type2_combo": "2",
                  "socket:type2_combo:output": "150 kW",
                },
              };
            for (const [id, access, hours] of [
              ["31001", "yes", "24/7"],
              ["31002", "customers", "24/7"],
              ["31003", "yes", ""],
            ] as const)
              yield {
                kind: "charge",
                sourceType: "node",
                sourceId: id,
                lat: 52.52,
                lon: 13.407,
                tags: {
                  amenity: "charging_station",
                  access,
                  opening_hours: hours,
                  fee: "no",
                  "parking:fee": "yes",
                  "socket:type2": "yes",
                  "socket:type2:output": "150 kW",
                },
              };
          }
          await importDataset(pool, six(), opts6);
          await migrate(pool);
          assert.deepEqual(await analyzePublishedDataset(pool), {
            status: "success",
          });
          assert.equal(
            (
              await pool.query(
                "SELECT count(*)::int n FROM pg_stat_user_tables WHERE relname IN ('locations','location_categories','transit_components') AND last_analyze IS NOT NULL",
              )
            ).rows[0].n,
            3,
          );
          assert.deepEqual(
            (
              await pool.query(
                "SELECT category,location_count FROM category_datasets WHERE category<>'charge' ORDER BY category",
              )
            ).rows,
            beforeCounts,
          );
          const req = (query: string) =>
            new Promise<any>((resolve, reject) =>
              httpGet(
                `http://127.0.0.1:${address.port}/api/locations?lat=52.52&lon=13.405&radius=5000&${query}`,
                { headers: { Host: "charge.bloli.com" } },
                (r) => {
                  let b = "";
                  r.on("data", (c) => (b += c));
                  r.on("end", () =>
                    resolve({ status: r.statusCode, body: JSON.parse(b) }),
                  );
                },
              ).on("error", reject),
            );
          const power = await req("connector=type2&minPowerKw=150");
          assert.equal(power.status, 200);
          assert.deepEqual(power.body.items.map((x: any) => x.id).sort(), [
            "node/31001",
            "node/31002",
            "node/31003",
          ]);
          const pub = await req(
            "connector=type2&minPowerKw=150&chargeAccess=public&openNow=true&fee=free",
          );
          assert.deepEqual(
            pub.body.items.map((x: any) => x.id),
            ["node/31001"],
          );
          assert.equal(pub.body.items[0].charging.parkingFee, "yes");
          const customer = await req(
            "connector=type2&minPowerKw=150&chargeAccess=customers",
          );
          assert.deepEqual(
            customer.body.items.map((x: any) => x.id),
            ["node/31002"],
          );
          const cap = await req("limit=100");
          assert.equal(cap.body.items.length, 100);
          assert.equal(cap.body.truncated, true);
          for (const q of [
            "mode=all",
            "sellerType=all",
            "connector=ccs&connector=type2",
            "minPowerKw=149",
          ])
            assert.equal((await req(q)).status, 400);
          const snapshot = (
            await pool.query(
              "SELECT category,location_count,imported_at FROM category_datasets ORDER BY category",
            )
          ).rows;
          await assert.rejects(
            importDataset(pool, six(), {
              ...opts6,
              minimumChargeStations: 999,
            }),
          );
          assert.deepEqual(
            (
              await pool.query(
                "SELECT category,location_count,imported_at FROM category_datasets ORDER BY category",
              )
            ).rows,
            snapshot,
          );
          await assert.rejects(
            importDataset(pool, six(), {
              ...opts6,
              categories: [
                "toilets",
                "tobacco",
                "kebab",
                "water",
                "transit",
              ] as any,
            }),
          );
        },
      );
      await t.test("schema migration backfills German memberships without changing live identities", async () => {
        const before = await pool.query("SELECT id FROM locations ORDER BY id");
        const categoryCounts = await pool.query("SELECT category,location_count,settlement_count FROM category_datasets ORDER BY category");
        await pool.query("DELETE FROM country_location_memberships; DELETE FROM country_settlement_memberships; DELETE FROM country_datasets");
        await migrate(pool);
        assert.deepEqual((await pool.query("SELECT id FROM locations ORDER BY id")).rows, before.rows);
        assert.deepEqual((await pool.query("SELECT category,location_count,settlement_count FROM country_datasets WHERE country_code='de' ORDER BY category")).rows, categoryCounts.rows);
        assert.equal((await pool.query("SELECT count(*)::int n FROM country_location_memberships WHERE country_code='de'")).rows[0].n, (await pool.query("SELECT count(*)::int n FROM location_categories")).rows[0].n);
      });
      await t.test("Romania imports atomically without replacing Germany", async () => {
        const roCoverage = {
          type: "MultiPolygon",
          coordinates: [[[[20, 43], [30, 43], [30, 49], [20, 49], [20, 43]]]],
        };
        const roRows = [
          { kind: "facility", sourceType: "node", sourceId: "81001", lat: 44.43, lon: 26.1, tags: { amenity: "toilets", name: "București WC", fee: "no" }, version: 1 },
          { kind: "seller", sourceType: "node", sourceId: "81002", lat: 44.43, lon: 26.1, tags: { shop: "tobacco", name: "Tutun" }, version: 1 },
          { kind: "kebab", sourceType: "node", sourceId: "81003", lat: 44.43, lon: 26.1, tags: { amenity: "fast_food", cuisine: "kebab", name: "Shaorma" }, version: 1 },
          { kind: "water", sourceType: "node", sourceId: "81004", lat: 44.43, lon: 26.1, tags: { amenity: "drinking_water" }, version: 1 },
          { kind: "transit", sourceType: "node", sourceId: "81005", lat: 44.43, lon: 26.1, tags: { railway: "station", name: "Gara de Nord" }, transport: { groups: [], routes: [] }, version: 1 },
          { kind: "charge", sourceType: "node", sourceId: "81006", lat: 44.43, lon: 26.1, tags: { amenity: "charging_station", "socket:type2": "2" }, version: 1 },
          { kind: 'atm', sourceType: 'node', sourceId: '81010', lat:44.43, lon:26.1, tags:{amenity:'atm',currency:'EUR;RON',cash_in:'yes',fee:'no',opening_hours:'24/7','name:hu':'Bankautomata'}, version:1 },
          { kind: 'accommodation', sourceType: 'node', sourceId: '81011', lat:44.43, lon:26.1, tags:{tourism:'hotel',stars:'4','opening_hours:reception':'08:00-18:00',website:'https://example.com'}, version:1 },
          // Extracted OSM area records can lack source-version metadata; these
          // are stored with source_version=0 and must still import safely.
          { kind: "settlement", sourceType: "node", sourceId: "81007", lat: 44.43, lon: 26.1, tags: { place: "city", name: "București", "addr:postcode": "010011" }, version: null },
          { kind: "facility", sourceType: "node", sourceId: "81008", lat: 52.52, lon: 13.405, tags: { amenity: "toilets", name: "Outside Romania" }, version: 1 },
          { kind: "settlement", sourceType: "node", sourceId: "81009", lat: 52.52, lon: 13.405, tags: { place: "city", name: "Outside Romania" }, version: 1 },
        ];
        const countryOptions = {
          ...opts,
          countryCode: "ro" as const,
          source: "romania-test",
          sourceChecksum: "b".repeat(32),
          boundarySource: "https://download.geofabrik.de/europe/romania.poly",
          boundaryChecksum: "a".repeat(64),
          coverage: roCoverage,
          categories: ["toilets", "tobacco", "kebab", "water", "transit", "charge", "atm", "accommodation"] as Category[],
          minimumFacilities: 1,
          minimumSellers: 1,
          minimumKebabs: 1,
          minimumWaterPoints: 1,
          minimumTransit: 1,
          minimumChargeStations: 1,
          minimumAtms: 1,
          minimumAccommodations: 1,
          minimumSettlements: 1,
          minimumRatio: 0.5,
        };
        const beforeMeasure=(await pool.query("SELECT category,location_count,imported_at FROM country_datasets ORDER BY country_code,category")).rows;
        const jobsBeforeMeasure=(await pool.query('SELECT count(*)::int n FROM import_jobs')).rows[0].n;
        const measured=await importDataset(pool,(async function*(){yield* roRows;})(),{...countryOptions,measureOnly:true,minimumAtms:undefined,minimumAccommodations:undefined});
        assert.equal(measured.atms,1);assert.equal(measured.accommodations,1);
        assert.deepEqual((await pool.query("SELECT category,location_count,imported_at FROM country_datasets ORDER BY country_code,category")).rows,beforeMeasure);
        assert.equal((await pool.query('SELECT count(*)::int n FROM import_jobs')).rows[0].n,jobsBeforeMeasure);
        await importDataset(pool, (async function* () { yield* roRows; })(), countryOptions);
        await migrate(pool);
        assert.equal((await pool.query("SELECT count(*)::int n FROM country_location_memberships WHERE country_code='de' AND location_id='node/81001'")).rows[0].n, 0);
        assert.equal((await pool.query("SELECT count(*)::int n FROM country_settlement_memberships WHERE country_code='de' AND settlement_id='node/81007'")).rows[0].n, 0);
        assert.equal((await pool.query("SELECT count(*)::int n FROM country_datasets WHERE country_code='ro'")).rows[0].n, 8);
        assert.equal((await pool.query("SELECT count(*)::int n FROM country_location_memberships WHERE country_code='ro'")).rows[0].n, 8);
        assert.equal((await pool.query("SELECT count(*)::int n FROM country_location_memberships WHERE country_code='ro' AND location_id='node/81008'")).rows[0].n, 0);
        assert.equal((await pool.query("SELECT count(*)::int n FROM country_settlement_memberships WHERE country_code='ro' AND settlement_id='node/81009'")).rows[0].n, 0);
        assert.equal((await pool.query("SELECT source_version FROM country_settlement_memberships WHERE country_code='ro' AND settlement_id='node/81007'")).rows[0].source_version, 0);
        assert.equal((await pool.query("SELECT status FROM countries WHERE code='ro'")).rows[0].status, "pending");
        await assert.rejects(activateCountry(pool, "at"), /ROLLOUT_GATE_NOT_PASSED/);
        const pendingStatus = await get("/api/status");
        assert.equal(pendingStatus.body.countries.find((c: any) => c.code === "ro").ready, true);
        assert.equal(pendingStatus.body.countries.find((c: any) => c.code === "ro").status, "pending");
        assert.equal((await get("/api/settlements?q=bucuresti&country=ro")).body.error, "COUNTRY_NOT_ACTIVE");
        await activateCountry(pool, "ro");
        const atms=await get('/api/locations?site=atm&lat=44.43&lon=26.1&radius=500&currency=EUR&deposit=yes&fee=free&openNow=true');
        assert.equal(atms.status,200);assert.equal(atms.body.items.length,1);assert.equal(atms.body.items[0].names.hu,'Bankautomata');
        assert.equal((await get('/api/locations?site=atm&lat=44.43&lon=26.1&currency=HUF')).body.items.length,0);
        const lodging=await get('/api/locations?site=stay&lat=44.43&lon=26.1&accommodationType=hotel');
        assert.equal(lodging.status,200);assert.equal(lodging.body.items[0].accommodation.type,'hotel');
        assert.equal((await get('/api/locations?site=stay&lat=44.43&lon=26.1&openNow=true')).status,400);
        // A new normalizer may derive additional translated names from identical
        // raw OSM data; that is not a same-version source conflict.
        await pool.query("UPDATE location_categories SET data=data #- '{names,hu}' WHERE category='atm' AND location_id='node/81010'");
        await importDataset(pool,(async function*(){yield* roRows;})(),countryOptions);
        assert.equal((await pool.query("SELECT data->'names'->>'hu' AS hu FROM location_categories WHERE category='atm' AND location_id='node/81010'")).rows[0].hu,'Bankautomata');
        const romanianSuggestion = await get("/api/settlements?q=bucuresti&country=ro");
        assert.equal(romanianSuggestion.status, 200);
        assert.equal(romanianSuggestion.body.items[0].name, "București");
        assert.equal(romanianSuggestion.body.items[0].countryCode, "ro");
        assert.equal(
          (await pool.query("SELECT search_name FROM settlements WHERE id='node/81007'")).rows[0].search_name,
          "bucuresti",
        );
        const bucharestSearch = await get("/api/locations?lat=44.43&lon=26.1&radius=500");
        assert.equal(bucharestSearch.status, 200);
        assert.equal(bucharestSearch.body.items[0].id, "node/81001");
        assert.equal(bucharestSearch.body.items[0].countryCode, "ro");
        assert.equal((await pool.query("SELECT count(*)::int n FROM country_location_memberships WHERE country_code='de'")).rows[0].n > 0, true);
        assert.equal((await pool.query("SELECT count(*)::int n FROM location_categories WHERE category='charge'")).rows[0].n >= 7, true);
        await assert.rejects(
          importDataset(pool, (async function* () { yield* roRows; })(), {
            ...countryOptions,
            datasetAt: "2026-10-27T00:00:00Z",
            minimumChargeStations: 2,
          }),
          /SUSPICIOUS_IMPORT/,
        );
        await assert.rejects(
          importDataset(pool, (async function* () { yield* roRows; })(), {
            ...countryOptions,
            categories: ["toilets", "tobacco", "kebab", "water", "transit"] as Category[],
          }),
          /INCOMPLETE_COUNTRY_SNAPSHOT/,
        );
        assert.equal((await pool.query("SELECT source FROM country_datasets WHERE country_code='ro' AND category='toilets'")).rows[0].source, "romania-test");
        const atOptions = {
          ...countryOptions,
          countryCode: "at" as const,
          source: "austria-test",
          boundarySource: "https://download.geofabrik.de/europe/austria.poly",
        };
        const publishAt = (rows: typeof roRows, options = atOptions) =>
          importDataset(pool, (async function* () { yield* rows; })(), options);
        await assert.rejects(activateCountry(pool, "hu"), /ROLLOUT_GATE_NOT_PASSED/);
        await publishAt(roRows);
        assert.equal((await pool.query("SELECT count(*)::int n FROM country_location_memberships WHERE location_id='node/81001' AND country_code IN ('ro','at')")).rows[0].n, 2);
        assert.equal((await pool.query("SELECT count(*)::int n FROM location_categories WHERE category='toilets' AND location_id='node/81001'")).rows[0].n, 1);
        await activateCountry(pool, "at");
        const borderSearch = await get("/api/locations?lat=44.43&lon=26.1&radius=500");
        assert.equal(borderSearch.body.items.filter((x: any) => x.id === "node/81001").length, 1);
        const conflicting = roRows.map((row: any) => row.sourceId === "81001" ? { ...row, tags: { ...row.tags, name: "Conflicting same-version edit" } } : row);
        await assert.rejects(publishAt(conflicting), /OSM_VERSION_CONFLICT/);
        assert.equal((await pool.query("SELECT source FROM country_datasets WHERE country_code='at' AND category='toilets'")).rows[0].source, "austria-test");
        const replacement = roRows.filter((row: any) => !["81008","81009"].includes(row.sourceId)).map((row: any, index: number) => ({ ...row, sourceId: String(82001 + index) }));
        await publishAt(replacement, { ...atOptions, source: "austria-test-2", datasetAt: "2026-10-26T00:00:00Z" });
        assert.equal((await pool.query("SELECT count(*)::int n FROM country_location_memberships WHERE country_code='ro' AND location_id='node/81001'")).rows[0].n, 1);
        assert.equal((await pool.query("SELECT count(*)::int n FROM location_categories WHERE category='toilets' AND location_id='node/81001'")).rows[0].n, 1);
        await assert.rejects(deactivateCountry(pool, "ro"), /DEACTIVATE_DOWNSTREAM_COUNTRIES_FIRST/);

        const huCoverage = {
          type: "MultiPolygon",
          coordinates: [[[[18.9, 47.4], [19.2, 47.4], [19.2, 47.7], [18.9, 47.7], [18.9, 47.4]]]],
        };
        const huRows = roRows.filter((row: any) => !["81008","81009"].includes(row.sourceId)).map((row: any) => ({
          ...row,
          sourceId: String(830000 + Number(row.sourceId)),
          lat: row.lat + 3.1,
          lon: row.lon - 7.06,
          tags: row.tags.name === "București" ? { ...row.tags, name: "Budapest", "addr:postcode": "1051" } : row.tags,
        }));
        const huOptions = {
          ...countryOptions,
          countryCode: "hu" as const,
          source: "hungary-test",
          boundarySource: "https://download.geofabrik.de/europe/hungary.poly",
          boundaryChecksum: "c".repeat(64),
          sourceChecksum: "d".repeat(32),
          coverage: huCoverage,
        };
        await importDataset(pool, (async function* () { yield* huRows; })(), huOptions);
        await activateCountry(pool, "hu");
        assert.equal((await pool.query("SELECT status FROM countries WHERE code='hu'")).rows[0].status, "active");
        await assert.rejects(deactivateCountry(pool, "at"), /DEACTIVATE_DOWNSTREAM_COUNTRIES_FIRST/);
        await deactivateCountry(pool, "hu");
        await deactivateCountry(pool, "at");
        await deactivateCountry(pool, "ro");
        assert.deepEqual((await pool.query("SELECT code,status FROM countries WHERE code IN ('ro','at','hu') ORDER BY code")).rows, [
          { code: "at", status: "pending" },
          { code: "hu", status: "pending" },
          { code: "ro", status: "pending" },
        ]);
      });
    } finally {
      server.close();
      await pool.end();
    }
  },
);
