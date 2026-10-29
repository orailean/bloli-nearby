import type pg from "pg";
import { coordinates, AppError } from "../shared/domain.js";
import type { Category } from "../shared/sites.js";
import type { SourceRecord, Facility } from "../shared/types.js";
import {
  COUNTRIES,
  minimumForCountry,
  minimumSettlementsForCountry,
  type CountryCode,
} from "../shared/countries.js";
import { categoryImports } from "./category-imports.js";
import { runRefresh, type RefreshContext } from "./refresh.js";
export interface ImportOptions {
  countryCode?: CountryCode;
  activateCountry?: boolean;
  source: string;
  sourceChecksum?: string;
  boundarySource?: string;
  boundaryChecksum?: string;
  datasetAt: string;
  coverage: object;
  minimumFacilities?: number;
  minimumSettlements?: number;
  minimumRatio?: number;
  categories?: Category[];
  minimumSellers?: number;
  minimumKebabs?: number;
  minimumWaterPoints?: number;
  minimumTransit?: number;
  minimumChargeStations?: number;
  minimumAtms?: number;
  minimumAccommodations?: number;
  measureOnly?: boolean;
}
export async function importDataset(
  pool: pg.Pool,
  records: AsyncIterable<unknown>,
  options: ImportOptions,
  context?: RefreshContext,
): Promise<{
  facilities: number;
  settlements: number;
  sellers: number;
  kebabs: number;
  waterPoints: number;
  transitStops: number;
  chargeStations: number;
  atms: number;
  accommodations: number;
}> {
  if (!Number.isFinite(Date.parse(options.datasetAt)))
    throw new AppError("INVALID_DATASET_DATE");
  if (!context && options.measureOnly) {
    const db = await pool.connect();
    let locked = false;
    try {
      locked = (await db.query("SELECT pg_try_advisory_lock(194159) AS locked"))
        .rows[0].locked;
      if (!locked) throw new AppError("IMPORT_LOCKED", 409);
      return await importDataset(pool, records, options, {
        db,
        jobId: "",
        countryCode: options.countryCode ?? "de",
      });
    } finally {
      if (locked) await db.query("SELECT pg_advisory_unlock(194159)");
      db.release();
    }
  }
  if (!context)
    return runRefresh(
      pool,
      options.source,
      (ctx) => importDataset(pool, records, options, ctx),
      options.countryCode ?? "de",
    );
  const { db, jobId } = context;
  const countryCode = options.countryCode ?? "de";
  const countryProfile = COUNTRIES.find(
    (country) => country.code === countryCode,
  );
  if (!countryProfile) throw new AppError("UNKNOWN_COUNTRY");
  if (
    countryCode !== "de" &&
    (!options.boundarySource ||
      !/^[0-9a-fA-F]{64}$/.test(options.boundaryChecksum || ""))
  )
    throw new AppError("MISSING_BOUNDARY_PROVENANCE");
  const categories = options.categories ?? ["toilets"];
  if (
    !Array.isArray(categories) ||
    !categories.includes("toilets") ||
    new Set(categories).size !== categories.length ||
    categories.some((c) => !Object.hasOwn(categoryImports, c))
  )
    throw new AppError("INVALID_CATEGORIES");
  if (
    countryCode !== "de" &&
    categories.length !== Object.keys(categoryImports).length
  )
    throw new AppError("INCOMPLETE_COUNTRY_SNAPSHOT");
  if (
    options.sourceChecksum &&
    !/^[0-9a-fA-F]{32}$/.test(options.sourceChecksum)
  )
    throw new AppError("INVALID_SOURCE_CHECKSUM");
  const ratio = options.minimumRatio ?? 0.75;
  const minimumSettlements =
    options.minimumSettlements ??
    minimumSettlementsForCountry(countryCode) ??
    (options.measureOnly ? 1 : countryCode === "de" ? 1000 : undefined);
  if (
    !Number.isFinite(ratio) ||
    ratio < 0.5 ||
    ratio > 1 ||
    minimumSettlements === undefined ||
    !Number.isInteger(minimumSettlements) ||
    minimumSettlements < 1 ||
    categories.some((c) => {
      const n =
        options[categoryImports[c].minimum] ??
        (options.measureOnly
          ? 1
          : countryCode === "de" && !["atm", "accommodation"].includes(c)
            ? categoryImports[c].defaultMinimum
            : minimumForCountry(countryCode, c));
      return n === undefined || !Number.isInteger(n) || n < 1;
    })
  )
    throw new AppError("SUSPICIOUS_IMPORT");
  try {
    await db.query("BEGIN");
    const active = (
      await db.query("SELECT * FROM country_datasets WHERE country_code=$1", [
        countryCode,
      ])
    ).rows;
    if (active.some((row) => !categories.includes(row.category)))
      throw new AppError("PARTIAL_CATEGORY_IMPORT");
    await db.query("SET LOCAL statement_timeout=0");
    await db.query(`CREATE TEMP TABLE stage_category_locations (
   category text NOT NULL,id text NOT NULL,data jsonb NOT NULL,fee text NOT NULL,location geography(Point,4326) NOT NULL,source_version integer NOT NULL,PRIMARY KEY(category,id)
  ) ON COMMIT DROP; CREATE TEMP TABLE stage_settlements (LIKE settlements INCLUDING ALL) ON COMMIT DROP`);
    let locations: Array<
        Facility & { category: Category; sourceVersion: number }
      > = [],
      settlements: unknown[] = [];
    const flush = async () => {
      if (locations.length)
        await db.query(
          `INSERT INTO stage_category_locations(category,id,data,fee,location,source_version)
    SELECT v->>'category',v->>'id',v-'sourceVersion',v->>'fee',ST_SetSRID(ST_MakePoint((v->>'lon')::float8,(v->>'lat')::float8),4326)::geography,COALESCE((v->>'sourceVersion')::int,0)
    FROM jsonb_array_elements($1::jsonb) v ON CONFLICT(category,id) DO UPDATE SET data=EXCLUDED.data,fee=EXCLUDED.fee,location=EXCLUDED.location`,
          [JSON.stringify(locations)],
        );
      if (settlements.length)
        await db.query(
          `INSERT INTO stage_settlements(id,name,postcode,region,names,location,place_type,source_version)
    SELECT v->>'id',v->>'name',v->>'postcode',v->>'region',v->'names',ST_SetSRID(ST_MakePoint((v->>'lon')::float8,(v->>'lat')::float8),4326)::geography,v->>'placeType',COALESCE((v->>'sourceVersion')::int,0)
    FROM jsonb_array_elements($1::jsonb) v ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,postcode=EXCLUDED.postcode,region=EXCLUDED.region,names=EXCLUDED.names,location=EXCLUDED.location,place_type=EXCLUDED.place_type,source_version=GREATEST(stage_settlements.source_version,EXCLUDED.source_version)`,
          [JSON.stringify(settlements)],
        );
      locations = [];
      settlements = [];
    };
    const batchIds = new Set<string>();
    for await (const raw of records) {
      if (!raw || typeof raw !== "object") throw new AppError("INVALID_RECORD");
      const r = raw as SourceRecord & { kind: string };
      if (
        !r.tags ||
        typeof r.tags !== "object" ||
        Array.isArray(r.tags) ||
        Object.values(r.tags).some((v) => typeof v !== "string")
      )
        throw new AppError("INVALID_TAGS");
      coordinates(r.lat, r.lon);
      if (
        !["node", "way", "relation"].includes(r.sourceType) ||
        !/^\d+$/.test(r.sourceId)
      )
        throw new AppError("INVALID_SOURCE");
      if (
        r.version != null &&
        (!Number.isSafeInteger(r.version) || r.version < 1)
      )
        throw new AppError("INVALID_SOURCE_VERSION");
      const key = `${r.kind}/${r.sourceType}/${r.sourceId}`;
      if (batchIds.has(key)) {
        await flush();
        batchIds.clear();
      }
      batchIds.add(key);
      if (r.kind === "settlement") {
        const t = r.tags,
          postcode = t.postal_code || t["addr:postcode"] || null,
          name = t.name || postcode;
        if (name)
          settlements.push({
            id: `${r.sourceType}/${r.sourceId}`,
            name,
            placeType: t.place || null,
            postcode,
            region: t["is_in:state"] || t["addr:state"] || t.is_in || null,
            names: Object.fromEntries(
              ["en", "de", "ro", "hu"]
                .filter((l) => t[`name:${l}`])
                .map((l) => [l, t[`name:${l}`]]),
            ),
            lat: r.lat,
            lon: r.lon,
            sourceVersion: r.version ?? 0,
          });
      } else {
        const category = (Object.keys(categoryImports) as Category[]).find(
          (c) => categoryImports[c].kind === r.kind,
        );
        if (!category) throw new AppError("INVALID_RECORD_KIND");
        if (!categories.includes(category))
          throw new AppError("UNDECLARED_CATEGORY");
        const location = categoryImports[category].normalize(r);
        if (location)
          locations.push({
            ...location,
            category,
            sourceVersion: r.version ?? 0,
          });
      }
      if (locations.length + settlements.length >= 1000) {
        await flush();
        batchIds.clear();
      }
    }
    await flush();
    const conflicting = await db.query(
      "SELECT id FROM stage_category_locations GROUP BY id HAVING count(DISTINCT ST_AsEWKB(location::geometry)) > 1 LIMIT 1",
    );
    if (conflicting.rowCount)
      throw new AppError("INCONSISTENT_SOURCE_GEOMETRY");
    const coverage = JSON.stringify(options.coverage);
    const valid = (
      await db.query(
        "SELECT ST_IsValid(ST_SetSRID(ST_GeomFromGeoJSON($1),4326)) AS valid",
        [coverage],
      )
    ).rows[0].valid;
    if (!valid) throw new AppError("INVALID_COVERAGE");
    for (const table of ["stage_category_locations", "stage_settlements"])
      await db.query(
        `DELETE FROM ${table} WHERE NOT ST_Covers(ST_SetSRID(ST_GeomFromGeoJSON($1),4326),location::geometry)`,
        [coverage],
      );
    const totals = (
      await db.query(
        "SELECT category,count(*)::int AS count FROM stage_category_locations GROUP BY category",
      )
    ).rows;
    const categoryCounts = new Map<string, number>(
      totals.map((row) => [row.category, row.count]),
    );
    const counts = {
      facilities: categoryCounts.get("toilets") ?? 0,
      sellers: categoryCounts.get("tobacco") ?? 0,
      kebabs: categoryCounts.get("kebab") ?? 0,
      waterPoints: categoryCounts.get("water") ?? 0,
      transitStops: categoryCounts.get("transit") ?? 0,
      chargeStations: categoryCounts.get("charge") ?? 0,
      atms: categoryCounts.get("atm") ?? 0,
      accommodations: categoryCounts.get("accommodation") ?? 0,
      settlements: (
        await db.query("SELECT count(*)::int AS n FROM stage_settlements")
      ).rows[0].n as number,
    };
    if (options.measureOnly) {
      await db.query("ROLLBACK");
      return counts;
    }
    const previous = active[0];
    if (
      counts.settlements < minimumSettlements ||
      (previous &&
        (counts.settlements < previous.settlement_count * ratio ||
          Date.parse(options.datasetAt) <
            new Date(previous.dataset_at).getTime()))
    )
      throw new AppError("SUSPICIOUS_IMPORT");
    for (const category of categories) {
      const count = categoryCounts.get(category) ?? 0;
      const previousCategory = active.find((row) => row.category === category);
      const minimum =
        options[categoryImports[category].minimum] ??
        (countryCode === "de" && !["atm", "accommodation"].includes(category)
          ? categoryImports[category].defaultMinimum
          : minimumForCountry(countryCode, category));
      if (
        !minimum ||
        count < minimum ||
        (previousCategory &&
          (count < previousCategory.location_count * ratio ||
            Date.parse(options.datasetAt) <
              new Date(previousCategory.dataset_at).getTime()))
      )
        throw new AppError("SUSPICIOUS_IMPORT");
    }
    const conflicts = await db.query(
      `SELECT s.category,s.id FROM stage_category_locations s
       JOIN location_categories c ON c.category=s.category AND c.location_id=s.id
       JOIN locations l ON l.id=s.id
       WHERE s.source_version>0 AND s.source_version=c.source_version
         AND (s.data->'tags'<>l.tags OR ST_AsEWKB(s.location::geometry)<>ST_AsEWKB(l.location::geometry))
       LIMIT 1`,
    );
    if (conflicts.rowCount) throw new AppError("OSM_VERSION_CONFLICT");
    await db.query(
      "DELETE FROM country_location_memberships WHERE country_code=$1 AND category=ANY($2::text[])",
      [countryCode, categories],
    );
    await db.query(
      "DELETE FROM country_settlement_memberships WHERE country_code=$1",
      [countryCode],
    );
    await db.query(
      `INSERT INTO settlements(id,name,postcode,region,names,location,place_type,source_version)
       SELECT id,name,postcode,region,names,location,place_type,source_version FROM stage_settlements
       ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,postcode=EXCLUDED.postcode,region=EXCLUDED.region,names=EXCLUDED.names,location=EXCLUDED.location,place_type=EXCLUDED.place_type,source_version=EXCLUDED.source_version
       WHERE EXCLUDED.source_version>=settlements.source_version`,
    );
    await db.query(
      "INSERT INTO country_settlement_memberships(country_code,settlement_id,source_version) SELECT $1,id,source_version FROM stage_settlements",
      [countryCode],
    );
    for (const category of categories) {
      await db.query(
        "INSERT INTO locations(id,location,tags,source_version) SELECT id,location,data->'tags',source_version FROM stage_category_locations WHERE category=$1 ON CONFLICT(id) DO UPDATE SET location=EXCLUDED.location,tags=EXCLUDED.tags,source_version=EXCLUDED.source_version WHERE EXCLUDED.source_version>=locations.source_version",
        [category],
      );
      await db.query(
        "INSERT INTO location_categories(category,location_id,data,fee,seller_type,source_version) SELECT category,id,data,fee,data->>'sellerType',source_version FROM stage_category_locations WHERE category=$1 ON CONFLICT(category,location_id) DO UPDATE SET data=EXCLUDED.data,fee=EXCLUDED.fee,seller_type=EXCLUDED.seller_type,source_version=EXCLUDED.source_version WHERE EXCLUDED.source_version>=location_categories.source_version",
        [category],
      );
      await db.query(
        "INSERT INTO country_location_memberships(country_code,category,location_id,source_version) SELECT $1,category,id,source_version FROM stage_category_locations WHERE category=$2",
        [countryCode, category],
      );
      await db.query(
        `INSERT INTO country_datasets(country_code,category,dataset_at,source,source_checksum,location_count,settlement_count,coverage,boundary_source,boundary_checksum)
         VALUES($1,$2,$3,$4,$5,$6,$7,ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($8),4326)),$9,$10)
         ON CONFLICT(country_code,category) DO UPDATE SET dataset_at=EXCLUDED.dataset_at,imported_at=now(),source=EXCLUDED.source,source_checksum=EXCLUDED.source_checksum,location_count=EXCLUDED.location_count,settlement_count=EXCLUDED.settlement_count,coverage=EXCLUDED.coverage,boundary_source=EXCLUDED.boundary_source,boundary_checksum=EXCLUDED.boundary_checksum`,
        [
          countryCode,
          category,
          options.datasetAt,
          options.source,
          options.sourceChecksum ?? null,
          categoryCounts.get(category) ?? 0,
          counts.settlements,
          coverage,
          options.boundarySource ?? countryProfile.boundaryUrl,
          options.boundaryChecksum ?? null,
        ],
      );
      if (countryCode === "de")
        await db.query(
          `INSERT INTO category_datasets(category,dataset_at,source,location_count,settlement_count,coverage) VALUES($1,$2,$3,$4,$5,ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($6),4326))) ON CONFLICT(category) DO UPDATE SET dataset_at=EXCLUDED.dataset_at,imported_at=now(),source=EXCLUDED.source,location_count=EXCLUDED.location_count,settlement_count=EXCLUDED.settlement_count,coverage=EXCLUDED.coverage`,
          [
            category,
            options.datasetAt,
            options.source,
            categoryCounts.get(category) ?? 0,
            counts.settlements,
            coverage,
          ],
        );
    }
    if (categories.includes("transit"))
      await db.query(
        `DELETE FROM transit_components t WHERE NOT EXISTS(SELECT 1 FROM country_location_memberships m WHERE m.category='transit' AND m.location_id=t.location_id);
       INSERT INTO transit_components(location_id,group_id,kind,modes)
       SELECT location_id,data->'transit'->>'groupId',data->'transit'->>'kind',ARRAY(SELECT jsonb_array_elements_text(data->'transit'->'modes'))
       FROM location_categories WHERE category='transit' AND data->'transit' IS NOT NULL
       ON CONFLICT(location_id) DO UPDATE SET group_id=EXCLUDED.group_id,kind=EXCLUDED.kind,modes=EXCLUDED.modes`,
      );
    await db.query(
      "DELETE FROM location_categories c WHERE NOT EXISTS(SELECT 1 FROM country_location_memberships m WHERE m.category=c.category AND m.location_id=c.location_id)",
    );
    await db.query(
      "DELETE FROM settlements s WHERE NOT EXISTS(SELECT 1 FROM country_settlement_memberships m WHERE m.settlement_id=s.id)",
    );
    await db.query(
      "UPDATE countries SET boundary_source=$2,boundary_checksum=$3,status=CASE WHEN $4 OR code='de' THEN 'active' ELSE status END WHERE code=$1",
      [
        countryCode,
        options.boundarySource ?? countryProfile.boundaryUrl,
        options.boundaryChecksum ?? null,
        options.activateCountry === true,
      ],
    );
    if (countryCode === "de") {
      await db.query(
        "DELETE FROM facilities; INSERT INTO facilities(id,data,fee,location) SELECT id,data,fee,location FROM stage_category_locations WHERE category='toilets'",
      );
      await db.query(
        `INSERT INTO dataset(dataset_at,source,facility_count,settlement_count,coverage) VALUES($1,$2,$3,$4,ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($5),4326)))
         ON CONFLICT(singleton) DO UPDATE SET dataset_at=EXCLUDED.dataset_at,imported_at=now(),source=EXCLUDED.source,facility_count=EXCLUDED.facility_count,settlement_count=EXCLUDED.settlement_count,coverage=EXCLUDED.coverage`,
        [
          options.datasetAt,
          options.source,
          counts.facilities,
          counts.settlements,
          coverage,
        ],
      );
    }
    await db.query(
      "DELETE FROM locations l WHERE NOT EXISTS(SELECT 1 FROM location_categories c WHERE c.location_id=l.id)",
    );
    await db.query(
      "UPDATE import_jobs SET status='success',finished_at=now(),facility_count=$2,settlement_count=$3,seller_count=$4,kebab_count=$5,water_count=$6,transit_count=$7,charge_count=$8,atm_count=$9,accommodation_count=$10 WHERE id=$1",
      [
        jobId,
        counts.facilities,
        counts.settlements,
        categories.includes("tobacco") ? counts.sellers : null,
        categories.includes("kebab") ? counts.kebabs : null,
        categories.includes("water") ? counts.waterPoints : null,
        categories.includes("transit") ? counts.transitStops : null,
        categories.includes("charge") ? counts.chargeStations : null,
        categories.includes("atm") ? counts.atms : null,
        categories.includes("accommodation") ? counts.accommodations : null,
      ],
    );
    await db.query("COMMIT");
    return counts;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}
