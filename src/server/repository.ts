import type pg from "pg";
import type {
  Dataset,
  SearchQuery,
  Facility,
  Settlement,
} from "../shared/types.js";
import { AppError } from "../shared/domain.js";
export async function datasetStatus(pool: pg.Pool): Promise<Dataset> {
  const row = (
    await pool.query(
      "SELECT dataset_at,imported_at,source,facility_count FROM dataset",
    )
  ).rows[0];
  const job = (
    await pool.query(
      "SELECT status,finished_at FROM import_jobs ORDER BY id DESC LIMIT 1",
    )
  ).rows[0];
  return {
    ready: !!row,
    datasetAt: row?.dataset_at?.toISOString() ?? null,
    importedAt: row?.imported_at?.toISOString() ?? null,
    source: row?.source ?? null,
    count: row?.facility_count ?? 0,
    stale: !!row && Date.now() - row.dataset_at.getTime() > 14 * 86400000,
    latestJob: job
      ? {
          status: job.status,
          finishedAt: job.finished_at?.toISOString() ?? null,
        }
      : null,
  };
}
export async function searchToilets(pool: pg.Pool, q: SearchQuery) {
  // Read the snapshot and dataset metadata consistently across concurrent imports.
  const db = await pool.connect();
  try {
    await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const meta = (
      await db.query(
        "SELECT *,ST_Covers(coverage,ST_SetSRID(ST_MakePoint($1,$2),4326)) AS covered FROM dataset",
        [q.lon, q.lat],
      )
    ).rows[0];
    if (!meta) throw new AppError("DATA_NOT_READY", 503);
    if (!meta.covered) throw new AppError("OUTSIDE_COVERAGE", 400);
    const rows = (
      await db.query(
        `SELECT data,ST_Distance(location,ST_SetSRID(ST_MakePoint($1,$2),4326)::geography) AS distance
      FROM facilities WHERE ST_DWithin(location,ST_SetSRID(ST_MakePoint($1,$2),4326)::geography,$3)
      AND ($4='all' OR fee=$4) ORDER BY distance,id LIMIT $5`,
        [q.lon, q.lat, q.radius, q.fee, q.limit + 1],
      )
    ).rows;
    await db.query("COMMIT");
    return {
      items: rows
        .slice(0, q.limit)
        .map((r) => ({ ...r.data, distance: r.distance })) as Facility[],
      truncated: rows.length > q.limit,
      dataset: {
        ready: true,
        datasetAt: meta.dataset_at.toISOString(),
        importedAt: meta.imported_at.toISOString(),
        count: meta.facility_count,
        source: meta.source,
        stale: Date.now() - meta.dataset_at.getTime() > 14 * 86400000,
        latestJob: null,
      } as Dataset,
    };
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    db.release();
  }
}
export async function searchSettlements(
  pool: pg.Pool,
  query: string,
): Promise<Settlement[]> {
  if (!(await datasetStatus(pool)).ready)
    throw new AppError("DATA_NOT_READY", 503);
  if (query.length < 2 || query.length > 80)
    throw new AppError("INVALID_QUERY");
  const escaped = query.replace(/[\\%_]/g, "\\$&");
  const rows = (
    await pool.query(
      `SELECT s.id,s.name,s.postcode,s.region,s.names,ST_Y(s.location::geometry) AS lat,ST_X(s.location::geometry) AS lon,
    CASE WHEN s.place_type IN ('city','town') THEN NULL ELSE (SELECT c.name FROM settlements c WHERE c.place_type IN ('city','town') AND c.id<>s.id ORDER BY c.location <-> s.location LIMIT 1) END AS "nearCity"
    FROM settlements s WHERE lower(s.name) LIKE lower($1) OR s.postcode LIKE $2
    ORDER BY (lower(s.name)=lower($3)) DESC,(s.postcode=$3) DESC,s.name,s.id LIMIT 15`,
      [`${escaped}%`, `${escaped}%`, query],
    )
  ).rows;
  return rows;
}
