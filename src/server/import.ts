import type pg from "pg";
import { normalizeFacility, coordinates, AppError } from "../shared/domain.js";
import { normalizeSeller } from "../shared/sellers.js";
import type { Category } from "../shared/sites.js";
import type { SourceRecord } from "../shared/types.js";
import { runRefresh, type RefreshContext } from "./refresh.js";
export interface ImportOptions {
  source: string;
  datasetAt: string;
  coverage: object;
  minimumFacilities?: number;
  minimumSettlements?: number;
  minimumRatio?: number;
  categories?: Category[];
  minimumSellers?: number;
}
export async function importDataset(
  pool: pg.Pool,
  records: AsyncIterable<unknown>,
  options: ImportOptions,
  context?: RefreshContext,
): Promise<{ facilities: number; settlements: number; sellers: number }> {
  if (!Number.isFinite(Date.parse(options.datasetAt)))
    throw new AppError("INVALID_DATASET_DATE");
  if (!context)
    return runRefresh(pool, options.source, (ctx) =>
      importDataset(pool, records, options, ctx),
    );
  const { db, jobId } = context;
  const categories = options.categories ?? ["toilets"];
  if (
    !categories.includes("toilets") ||
    categories.some((value) => !["toilets", "tobacco"].includes(value))
  )
    throw new AppError("INVALID_CATEGORIES");
  const withSellers = categories.includes("tobacco");
  try {
    await db.query("BEGIN");
    if (
      !withSellers &&
      (
        await db.query(
          "SELECT 1 FROM category_datasets WHERE category='tobacco'",
        )
      ).rowCount
    )
      throw new AppError("PARTIAL_CATEGORY_IMPORT");
    await db.query("SET LOCAL statement_timeout=0");
    await db.query(
      "CREATE TEMP TABLE stage_facilities (LIKE facilities INCLUDING ALL) ON COMMIT DROP; CREATE TEMP TABLE stage_settlements (LIKE settlements INCLUDING ALL) ON COMMIT DROP; CREATE TEMP TABLE stage_sellers (LIKE facilities INCLUDING ALL) ON COMMIT DROP",
    );
    let sellers: unknown[] = [];
    let facilities: unknown[] = [],
      settlements: unknown[] = [];
    const flush = async () => {
      if (facilities.length)
        await db.query(
          `INSERT INTO stage_facilities(id,data,fee,location)
        SELECT v->>'id',v,v->>'fee',ST_SetSRID(ST_MakePoint((v->>'lon')::float8,(v->>'lat')::float8),4326)::geography
        FROM jsonb_array_elements($1::jsonb) v ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data,fee=EXCLUDED.fee,location=EXCLUDED.location`,
          [JSON.stringify(facilities)],
        );
      if (sellers.length)
        await db.query(
          `INSERT INTO stage_sellers(id,data,fee,location)
        SELECT v->>'id',v,'unknown',ST_SetSRID(ST_MakePoint((v->>'lon')::float8,(v->>'lat')::float8),4326)::geography
        FROM jsonb_array_elements($1::jsonb) v ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data,location=EXCLUDED.location`,
          [JSON.stringify(sellers)],
        );
      if (settlements.length)
        await db.query(
          `INSERT INTO stage_settlements(id,name,postcode,region,names,location,place_type)
        SELECT v->>'id',v->>'name',v->>'postcode',v->>'region',v->'names',ST_SetSRID(ST_MakePoint((v->>'lon')::float8,(v->>'lat')::float8),4326)::geography,v->>'placeType'
        FROM jsonb_array_elements($1::jsonb) v ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,postcode=EXCLUDED.postcode,region=EXCLUDED.region,names=EXCLUDED.names,location=EXCLUDED.location,place_type=EXCLUDED.place_type`,
          [JSON.stringify(settlements)],
        );
      facilities = [];
      sellers = [];
      settlements = [];
    };
    // A batch can contain duplicate source identities. Flush duplicates into the existing stage rows.
    const batchIds = new Set<string>();
    for await (const raw of records) {
      if (!raw || typeof raw !== "object") throw new AppError("INVALID_RECORD");
      const r = raw as SourceRecord & { kind: string };
      if (
        !r.tags ||
        typeof r.tags !== "object" ||
        Object.values(r.tags).some((v) => typeof v !== "string")
      )
        throw new AppError("INVALID_TAGS");
      coordinates(r.lat, r.lon);
      if (
        !["node", "way", "relation"].includes(r.sourceType) ||
        !/^\d+$/.test(r.sourceId)
      )
        throw new AppError("INVALID_SOURCE");
      const key = `${r.kind}/${r.sourceType}/${r.sourceId}`;
      if (batchIds.has(key)) {
        await flush();
        batchIds.clear();
      }
      batchIds.add(key);
      if (r.kind === "facility") {
        const facility = normalizeFacility(r);
        if (facility) facilities.push(facility);
      } else if (r.kind === "seller") {
        if (!withSellers) throw new AppError("UNDECLARED_CATEGORY");
        const seller = normalizeSeller(r);
        if (seller) sellers.push(seller);
      } else if (r.kind === "settlement") {
        const t = r.tags,
          postcode = t.postal_code || t["addr:postcode"] || null,
          name = t.name || postcode;
        if (name)
          settlements.push({
            id: `${r.sourceType}/${r.sourceId}`,
            name,
            placeType: t.place || null,
            postcode,
            region: t["is_in:state"] || t["addr:state"] || t["is_in"] || null,
            names: Object.fromEntries(
              ["en", "de", "ro"]
                .filter((l) => t[`name:${l}`])
                .map((l) => [l, t[`name:${l}`]]),
            ),
            lat: r.lat,
            lon: r.lon,
          });
      } else throw new AppError("INVALID_RECORD_KIND");
      if (facilities.length + sellers.length + settlements.length >= 1000) {
        await flush();
        batchIds.clear();
      }
    }
    await flush();
    const coverage = JSON.stringify(options.coverage);
    const valid = (
      await db.query(
        "SELECT ST_IsValid(ST_SetSRID(ST_GeomFromGeoJSON($1),4326)) AS valid",
        [coverage],
      )
    ).rows[0].valid;
    if (!valid) throw new AppError("INVALID_COVERAGE");
    // Extract buffers may contain neighbouring objects; publish only covered points.
    for (const table of [
      "stage_facilities",
      "stage_settlements",
      "stage_sellers",
    ])
      await db.query(
        `DELETE FROM ${table} WHERE NOT ST_Covers(ST_SetSRID(ST_GeomFromGeoJSON($1),4326),location::geometry)`,
        [coverage],
      );
    const counts = (
      await db.query(
        "SELECT (SELECT count(*)::int FROM stage_facilities) AS facilities,(SELECT count(*)::int FROM stage_settlements) AS settlements,(SELECT count(*)::int FROM stage_sellers) AS sellers",
      )
    ).rows[0];
    const previous = (await db.query("SELECT * FROM dataset")).rows[0];
    const previousSellers = (
      await db.query("SELECT * FROM category_datasets WHERE category='tobacco'")
    ).rows[0];
    const ratio = options.minimumRatio ?? 0.75;
    if (
      ratio < 0.5 ||
      ratio > 1 ||
      counts.facilities < (options.minimumFacilities ?? 1000) ||
      counts.settlements < (options.minimumSettlements ?? 1000) ||
      (withSellers &&
        (counts.sellers < (options.minimumSellers ?? 100) ||
          (previousSellers &&
            (counts.sellers < previousSellers.location_count * ratio ||
              Date.parse(options.datasetAt) <
                new Date(previousSellers.dataset_at).getTime())))) ||
      (previous &&
        (counts.facilities < previous.facility_count * ratio ||
          counts.settlements < previous.settlement_count * ratio ||
          Date.parse(options.datasetAt) <
            new Date(previous.dataset_at).getTime()))
    )
      throw new AppError("SUSPICIOUS_IMPORT");
    await db.query(
      "DELETE FROM facilities; INSERT INTO facilities SELECT * FROM stage_facilities; DELETE FROM settlements; INSERT INTO settlements SELECT * FROM stage_settlements; DELETE FROM dataset",
    );
    await db.query(
      `INSERT INTO dataset(dataset_at,source,facility_count,settlement_count,coverage)
      VALUES($1,$2,$3,$4,ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($5),4326)))`,
      [
        options.datasetAt,
        options.source,
        counts.facilities,
        counts.settlements,
        coverage,
      ],
    );
    // Refresh only declared categories. Keep legacy toilets and normalized
    // memberships in the same transaction for rollback compatibility.
    for (const [category, table, count] of [
      ["toilets", "stage_facilities", counts.facilities],
      ...(withSellers ? [["tobacco", "stage_sellers", counts.sellers]] : []),
    ] as Array<[Category, string, number]>) {
      await db.query(
        `INSERT INTO locations(id,location,tags) SELECT id,location,data->'tags' FROM ${table} ON CONFLICT(id) DO UPDATE SET location=EXCLUDED.location,tags=EXCLUDED.tags`,
      );
      await db.query("DELETE FROM location_categories WHERE category=$1", [
        category,
      ]);
      await db.query(
        `INSERT INTO location_categories(category,location_id,data,fee,seller_type) SELECT $1,id,data,fee,data->>'sellerType' FROM ${table}`,
        [category],
      );
      await db.query(
        `INSERT INTO category_datasets(category,dataset_at,source,location_count,settlement_count,coverage) VALUES($1,$2,$3,$4,$5,ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($6),4326))) ON CONFLICT(category) DO UPDATE SET dataset_at=EXCLUDED.dataset_at,imported_at=now(),source=EXCLUDED.source,location_count=EXCLUDED.location_count,settlement_count=EXCLUDED.settlement_count,coverage=EXCLUDED.coverage`,
        [
          category,
          options.datasetAt,
          options.source,
          count,
          counts.settlements,
          coverage,
        ],
      );
    }
    await db.query(
      "DELETE FROM locations l WHERE NOT EXISTS(SELECT 1 FROM location_categories c WHERE c.location_id=l.id)",
    );
    await db.query("UPDATE import_jobs SET seller_count=$2 WHERE id=$1", [
      jobId,
      withSellers ? counts.sellers : null,
    ]);
    await db.query(
      "UPDATE import_jobs SET status='success',finished_at=now(),facility_count=$2,settlement_count=$3 WHERE id=$1",
      [jobId, counts.facilities, counts.settlements],
    );
    await db.query("COMMIT");
    return counts;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}
