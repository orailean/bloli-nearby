import { transitRows } from "./transit-repository.js";
import type { Category } from "../shared/sites.js";
import type { CountryCode } from "../shared/countries.js";
import type pg from "pg";
import type {
  Dataset,
  SearchQuery,
  Facility,
  Settlement,
} from "../shared/types.js";
import { applySellerDefaults } from "../shared/sellers.js";
import { isOpenNow } from "./opening-hours.js";
import { AppError } from "../shared/domain.js";
import { normalizeSettlementSearch } from "../shared/settlement-search.js";
export async function datasetStatus(
  pool: pg.Pool,
  category: Category = "toilets",
): Promise<Dataset> {
  const rows = (
    await pool.query(
      `SELECT c.code,c.name,c.timezone,c.status,d.dataset_at,d.imported_at,d.source,d.location_count,d.settlement_count,
        j.id AS job_id,j.status AS job_status,j.started_at AS job_started_at,j.finished_at AS job_finished_at,j.error AS job_error,
        j.facility_count,j.seller_count,j.kebab_count,j.water_count,j.transit_count,j.charge_count,j.atm_count,j.accommodation_count,j.view_count,j.sights_count,j.settlement_count AS job_settlement_count
       FROM countries c LEFT JOIN country_datasets d ON d.country_code=c.code AND d.category=$1
       LEFT JOIN LATERAL(SELECT id,status,started_at,finished_at,error,facility_count,seller_count,kebab_count,water_count,transit_count,charge_count,atm_count,accommodation_count,view_count,sights_count,settlement_count FROM import_jobs WHERE country_code=c.code ORDER BY id DESC LIMIT 1) j ON true
       ORDER BY c.rollout_order`,
      [category],
    )
  ).rows;
  const countries = rows.map((row) => ({
    code: row.code,
    name: row.name,
    timezone: row.timezone,
    status: row.status,
    ready: !!row.dataset_at,
    datasetAt: row.dataset_at?.toISOString() ?? null,
    importedAt: row.imported_at?.toISOString() ?? null,
    count: row.location_count ?? 0,
    settlementCount: row.settlement_count ?? 0,
    source: row.source ?? null,
    stale:
      !!row.dataset_at && Date.now() - row.dataset_at.getTime() > 14 * 86400000,
    latestRefresh: row.job_id
      ? {
          status: row.job_status,
          startedAt: row.job_started_at.toISOString(),
          finishedAt: row.job_finished_at?.toISOString() ?? null,
          error: row.job_error,
          counts: {
            toilets: row.facility_count,
            tobacco: row.seller_count,
            kebab: row.kebab_count,
            water: row.water_count,
            transit: row.transit_count,
            charge: row.charge_count,
            atm: row.atm_count,
            accommodation: row.accommodation_count,
            view: row.view_count,
            sights: row.sights_count,
            settlements: row.job_settlement_count,
          },
        }
      : null,
  }));
  const active = rows.filter(
    (row) => row.status === "active" && row.dataset_at,
  );
  const count = active.length
    ? (
        await pool.query(
          `SELECT count(DISTINCT m.location_id)::int AS count FROM country_location_memberships m
           JOIN countries c ON c.code=m.country_code AND c.status='active'
           WHERE m.category=$1`,
          [category],
        )
      ).rows[0].count
    : 0;
  const date = (field: "dataset_at" | "imported_at") =>
    active.length
      ? new Date(
          Math.min(...active.map((row) => row[field].getTime())),
        ).toISOString()
      : null;
  const latest = active
    .filter((row) => row.job_id)
    .sort((a, b) => Number(b.job_id) - Number(a.job_id))[0];
  return {
    ready: active.length > 0,
    datasetAt: date("dataset_at"),
    importedAt: date("imported_at"),
    source:
      active.length === 1
        ? active[0].source
        : active.length
          ? active.map((row) => row.code.toUpperCase()).join(", ")
          : null,
    count,
    stale: active.some(
      (row) => Date.now() - row.dataset_at.getTime() > 14 * 86400000,
    ),
    latestJob: latest
      ? {
          status: latest.job_status,
          startedAt: latest.job_started_at?.toISOString(),
          finishedAt: latest.job_finished_at?.toISOString() ?? null,
          error: latest.job_error,
        }
      : null,
    countries,
  };
}
export const searchToilets = (pool: pg.Pool, q: SearchQuery) =>
  searchLocations(pool, q, "toilets");
export async function searchLocations(
  pool: pg.Pool,
  q: SearchQuery,
  category: Category,
) {
  // Read the snapshot and dataset metadata consistently across concurrent imports.
  const db = await pool.connect();
  try {
    await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const meta = (
      await db.query(
        `SELECT min(d.dataset_at) AS dataset_at,min(d.imported_at) AS imported_at,
           array_agg(DISTINCT d.source ORDER BY d.source) AS sources,
           (SELECT COALESCE(sum(active_d.location_count),0)::int
            FROM country_datasets active_d
            JOIN countries active_c ON active_c.code=active_d.country_code AND active_c.status='active'
            WHERE active_d.category=$3) AS facility_count,
           COALESCE(bool_or(ST_Covers(d.coverage,ST_SetSRID(ST_MakePoint($1,$2),4326))),false) AS covered
         FROM countries c JOIN country_datasets d ON d.country_code=c.code AND d.category=$3
         WHERE c.status='active'`,
        [q.lon, q.lat, category],
      )
    ).rows[0];
    if (!meta) throw new AppError("DATA_NOT_READY", 503);
    if (!meta.dataset_at) throw new AppError("DATA_NOT_READY", 503);
    if (!meta.covered) throw new AppError("OUTSIDE_COVERAGE", 400);
    const sql = `WITH nearby_locations AS MATERIALIZED (
      SELECT id,location FROM locations
      WHERE ST_DWithin(location,ST_SetSRID(ST_MakePoint($1,$2),4326)::geography,$3)
    )
    SELECT * FROM (
      SELECT DISTINCT ON (c.location_id) c.data,m.country_code AS "countryCode",co.name AS "countryName",co.timezone,
        ST_Distance(l.location,ST_SetSRID(ST_MakePoint($1,$2),4326)::geography) AS distance,c.location_id AS id
      FROM nearby_locations l JOIN location_categories c ON c.location_id=l.id
      JOIN country_location_memberships m ON m.category=c.category AND m.location_id=c.location_id
      JOIN countries co ON co.code=m.country_code AND co.status='active'
      JOIN country_datasets d ON d.country_code=co.code AND d.category=c.category
      WHERE c.category=$4 AND ($5='all' OR c.fee=$5) AND ($6='all' OR c.seller_type=$6)
      ${
        category === "charge"
          ? `AND (($7='all' AND $8::float8=0) OR EXISTS(
        SELECT 1 FROM jsonb_array_elements(COALESCE(c.data->'charging'->'connectors','[]'::jsonb)) socket
        WHERE ($7='all' OR socket->>'type'=$7) AND ($8::float8=0 OR (socket->>'outputKw')::float8 >= $8::float8)
      )) AND ($9='all' OR c.data->>'access'=$9)`
          : category === "atm"
            ? `AND ($7='all' OR c.data->'atm'->'currencies' ? $7) AND ($8='all' OR c.data->'atm'->>'deposit'=$8)`
            : category === "accommodation"
              ? `AND ($7='all' OR c.data->'accommodation'->>'type'=$7)`
              : category === "view" || category === "sights"
                ? `AND ($7='all' OR c.data->'tourist'->>'type'=$7)`
                : ""
      }
      ORDER BY c.location_id,m.source_version DESC,m.country_code
      ) unique_results ORDER BY distance,id`;
    const parameters: unknown[] = [
      q.lon,
      q.lat,
      q.radius,
      category,
      q.fee,
      q.sellerType ?? "all",
    ];
    if (category === "charge")
      parameters.push(
        q.connector ?? "all",
        q.minPowerKw ?? 0,
        q.chargeAccess ?? "all",
      );
    if (category === "atm")
      parameters.push(q.currency ?? "all", q.deposit ?? "all");
    if (category === "accommodation")
      parameters.push(q.accommodationType ?? "all");
    if (category === "view") parameters.push(q.viewType ?? "all");
    if (category === "sights") parameters.push(q.sightType ?? "all");
    let rows: Array<{
      data: Facility;
      distance: number;
      countryCode: string;
      countryName: string;
      timezone: string;
    }>;
    if (category === "transit") {
      rows = await transitRows(db, q);
    } else if (q.openNow) {
      // Evaluate every candidate before applying the result cap. A cursor bounds
      // memory even when many closer locations are closed or lack known hours.
      await db.query(
        `DECLARE open_candidates NO SCROLL CURSOR FOR ${sql}`,
        parameters,
      );
      rows = [];
      const now = new Date();
      while (rows.length <= q.limit) {
        const batch = (await db.query("FETCH FORWARD 250 FROM open_candidates"))
          .rows;
        if (!batch.length) break;
        for (const candidate of batch) {
          candidate.data = applySellerDefaults(candidate.data);
          candidate.data.countryCode = candidate.countryCode;
          candidate.data.timezone = candidate.timezone;
          if (isOpenNow(candidate.data, now)) rows.push(candidate);
          if (rows.length > q.limit) break;
        }
      }
      await db.query("CLOSE open_candidates");
    } else {
      rows = (
        await db.query(`${sql} LIMIT $${parameters.length + 1}`, [
          ...parameters,
          q.limit + 1,
        ])
      ).rows;
    }
    await db.query("COMMIT");
    return {
      items: rows.slice(0, q.limit).map((r) => ({
        ...applySellerDefaults(r.data),
        countryCode: r.countryCode,
        countryName: r.countryName,
        timezone: r.timezone,
        distance: r.distance,
      })) as Facility[],
      truncated: rows.length > q.limit,
      dataset: {
        ready: true,
        datasetAt: meta.dataset_at.toISOString(),
        importedAt: meta.imported_at.toISOString(),
        count: meta.facility_count,
        source: meta.sources?.join(", ") ?? null,
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
  category: Category = "toilets",
  country: CountryCode | "all" = "all",
): Promise<Settlement[]> {
  const ready = (
    await pool.query(
      `SELECT EXISTS(SELECT 1 FROM countries c JOIN country_datasets d ON d.country_code=c.code
     WHERE c.status='active' AND d.category=$1) AS ready`,
      [category],
    )
  ).rows[0].ready;
  if (!ready) throw new AppError("DATA_NOT_READY", 503);
  if (query.length < 2 || query.length > 80)
    throw new AppError("INVALID_QUERY");
  if (country !== "all") {
    const activeCountry = (
      await pool.query(
        `SELECT 1 FROM countries c JOIN country_datasets d ON d.country_code=c.code AND d.category=$2
         WHERE c.code=$1 AND c.status='active'`,
        [country, category],
      )
    ).rowCount;
    if (!activeCountry) throw new AppError("COUNTRY_NOT_ACTIVE");
  }
  const escaped = query.replace(/[\\%_]/g, "\\$&");
  const normalized = normalizeSettlementSearch(query);
  const escapedNormalized = normalized.replace(/[\\%_]/g, "\\$&");
  const rows = (
    await pool.query(
      `SELECT id,name,postcode,region,names,lat,lon,"countryCode","countryName","nearCity" FROM (
         SELECT DISTINCT ON(s.id) s.id,s.name,s.search_name,s.postcode,s.region,s.names,
           ST_Y(s.location::geometry) AS lat,ST_X(s.location::geometry) AS lon,
           m.country_code AS "countryCode",c.name AS "countryName",
           CASE WHEN s.place_type IN ('city','town') THEN NULL ELSE (
             SELECT city.name FROM settlements city
             JOIN country_settlement_memberships cm ON cm.settlement_id=city.id AND cm.country_code=m.country_code
             JOIN country_datasets cd ON cd.country_code=cm.country_code AND cd.category=$5
             WHERE city.place_type IN ('city','town') AND city.id<>s.id
             ORDER BY city.location <-> s.location LIMIT 1
           ) END AS "nearCity"
         FROM settlements s
         JOIN country_settlement_memberships m ON m.settlement_id=s.id
         JOIN countries c ON c.code=m.country_code AND c.status='active'
         JOIN country_datasets d ON d.country_code=c.code AND d.category=$5
         WHERE ($6='all' OR c.code=$6)
           AND (s.search_name LIKE $1 OR s.postcode LIKE $2)
         ORDER BY s.id,m.source_version DESC,m.country_code
       ) matched
       ORDER BY (search_name=$3) DESC,(postcode=$4) DESC,name,id LIMIT 15`,
      [
        `${escapedNormalized}%`,
        `${escaped}%`,
        normalized,
        query,
        category,
        country,
      ],
    )
  ).rows;
  return rows;
}
