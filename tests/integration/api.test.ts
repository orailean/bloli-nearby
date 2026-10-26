import { runRefresh } from "../../src/server/refresh.js";
import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { get as httpGet } from "node:http";
import { createPool, migrate } from "../../src/server/db.js";
import { importDataset } from "../../src/server/import.js";
import { createApi } from "../../src/server/api.js";

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
    await pool.query(
      "TRUNCATE location_categories,locations,category_datasets,facilities,settlements,dataset,import_jobs",
    );
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
    } finally {
      server.close();
      await pool.end();
    }
  },
);
