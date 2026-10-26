import type pg from "pg";
import { normalizeFacility, coordinates, AppError } from "../shared/domain.js";
import type { SourceRecord } from "../shared/types.js";
import { runRefresh, type RefreshContext } from "./refresh.js";
export interface ImportOptions {
  source: string;
  datasetAt: string;
  coverage: object;
  minimumFacilities?: number;
  minimumSettlements?: number;
  minimumRatio?: number;
}
export async function importDataset(
  pool: pg.Pool,
  records: AsyncIterable<unknown>,
  options: ImportOptions,
  context?: RefreshContext,
): Promise<{ facilities: number; settlements: number }> {
  if (!Number.isFinite(Date.parse(options.datasetAt)))
    throw new AppError("INVALID_DATASET_DATE");
  if (!context)
    return runRefresh(pool, options.source, (ctx) =>
      importDataset(pool, records, options, ctx),
    );
  const { db, jobId } = context;
  try {
    await db.query("BEGIN");
    await db.query("SET LOCAL statement_timeout=0");
    await db.query(
      "CREATE TEMP TABLE stage_facilities (LIKE facilities INCLUDING ALL) ON COMMIT DROP; CREATE TEMP TABLE stage_settlements (LIKE settlements INCLUDING ALL) ON COMMIT DROP",
    );
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
      if (settlements.length)
        await db.query(
          `INSERT INTO stage_settlements(id,name,postcode,region,names,location,place_type)
        SELECT v->>'id',v->>'name',v->>'postcode',v->>'region',v->'names',ST_SetSRID(ST_MakePoint((v->>'lon')::float8,(v->>'lat')::float8),4326)::geography,v->>'placeType'
        FROM jsonb_array_elements($1::jsonb) v ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,postcode=EXCLUDED.postcode,region=EXCLUDED.region,names=EXCLUDED.names,location=EXCLUDED.location,place_type=EXCLUDED.place_type`,
          [JSON.stringify(settlements)],
        );
      facilities = [];
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
      if (facilities.length + settlements.length >= 1000) {
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
    for (const table of ["stage_facilities", "stage_settlements"])
      await db.query(
        `DELETE FROM ${table} WHERE NOT ST_Covers(ST_SetSRID(ST_GeomFromGeoJSON($1),4326),location::geometry)`,
        [coverage],
      );
    const counts = (
      await db.query(
        "SELECT (SELECT count(*)::int FROM stage_facilities) AS facilities,(SELECT count(*)::int FROM stage_settlements) AS settlements",
      )
    ).rows[0];
    const previous = (await db.query("SELECT * FROM dataset")).rows[0];
    const ratio = options.minimumRatio ?? 0.75;
    if (
      ratio < 0.5 ||
      ratio > 1 ||
      counts.facilities < (options.minimumFacilities ?? 1000) ||
      counts.settlements < (options.minimumSettlements ?? 1000) ||
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
