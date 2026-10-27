import type pg from "pg";
import { coordinates, AppError } from "../shared/domain.js";
import type { Category } from "../shared/sites.js";
import type { SourceRecord, Facility } from "../shared/types.js";
import { categoryImports } from "./category-imports.js";
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
  minimumKebabs?: number;
  minimumWaterPoints?: number;
  minimumTransit?: number;
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
}> {
  if (!Number.isFinite(Date.parse(options.datasetAt)))
    throw new AppError("INVALID_DATASET_DATE");
  if (!context)
    return runRefresh(pool, options.source, (ctx) =>
      importDataset(pool, records, options, ctx),
    );
  const { db, jobId } = context;
  const categories = options.categories ?? ["toilets"];
  if (
    !Array.isArray(categories) ||
    !categories.includes("toilets") ||
    new Set(categories).size !== categories.length ||
    categories.some((c) => !Object.hasOwn(categoryImports, c))
  )
    throw new AppError("INVALID_CATEGORIES");
  const ratio = options.minimumRatio ?? 0.75;
  const minimumSettlements = options.minimumSettlements ?? 1000;
  if (
    !Number.isFinite(ratio) ||
    ratio < 0.5 ||
    ratio > 1 ||
    !Number.isInteger(minimumSettlements) ||
    minimumSettlements < 1 ||
    categories.some((c) => {
      const n =
        options[categoryImports[c].minimum] ??
        categoryImports[c].defaultMinimum;
      return !Number.isInteger(n) || n < 1;
    })
  )
    throw new AppError("SUSPICIOUS_IMPORT");
  try {
    await db.query("BEGIN");
    const active = (await db.query("SELECT * FROM category_datasets")).rows;
    if (active.some((row) => !categories.includes(row.category)))
      throw new AppError("PARTIAL_CATEGORY_IMPORT");
    await db.query("SET LOCAL statement_timeout=0");
    await db.query(`CREATE TEMP TABLE stage_category_locations (
   category text NOT NULL,id text NOT NULL,data jsonb NOT NULL,fee text NOT NULL,location geography(Point,4326) NOT NULL,PRIMARY KEY(category,id)
  ) ON COMMIT DROP; CREATE TEMP TABLE stage_settlements (LIKE settlements INCLUDING ALL) ON COMMIT DROP`);
    let locations: Array<Facility & { category: Category }> = [],
      settlements: unknown[] = [];
    const flush = async () => {
      if (locations.length)
        await db.query(
          `INSERT INTO stage_category_locations(category,id,data,fee,location)
    SELECT v->>'category',v->>'id',v,v->>'fee',ST_SetSRID(ST_MakePoint((v->>'lon')::float8,(v->>'lat')::float8),4326)::geography
    FROM jsonb_array_elements($1::jsonb) v ON CONFLICT(category,id) DO UPDATE SET data=EXCLUDED.data,fee=EXCLUDED.fee,location=EXCLUDED.location`,
          [JSON.stringify(locations)],
        );
      if (settlements.length)
        await db.query(
          `INSERT INTO stage_settlements(id,name,postcode,region,names,location,place_type)
    SELECT v->>'id',v->>'name',v->>'postcode',v->>'region',v->'names',ST_SetSRID(ST_MakePoint((v->>'lon')::float8,(v->>'lat')::float8),4326)::geography,v->>'placeType'
    FROM jsonb_array_elements($1::jsonb) v ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,postcode=EXCLUDED.postcode,region=EXCLUDED.region,names=EXCLUDED.names,location=EXCLUDED.location,place_type=EXCLUDED.place_type`,
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
              ["en", "de", "ro"]
                .filter((l) => t[`name:${l}`])
                .map((l) => [l, t[`name:${l}`]]),
            ),
            lat: r.lat,
            lon: r.lon,
          });
      } else {
        const category = (Object.keys(categoryImports) as Category[]).find(
          (c) => categoryImports[c].kind === r.kind,
        );
        if (!category) throw new AppError("INVALID_RECORD_KIND");
        if (!categories.includes(category))
          throw new AppError("UNDECLARED_CATEGORY");
        const location = categoryImports[category].normalize(r);
        if (location) locations.push({ ...location, category });
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
      settlements: (
        await db.query("SELECT count(*)::int AS n FROM stage_settlements")
      ).rows[0].n as number,
    };
    const previous = (await db.query("SELECT * FROM dataset")).rows[0];
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
      if (
        count <
          (options[categoryImports[category].minimum] ??
            categoryImports[category].defaultMinimum) ||
        (previousCategory &&
          (count < previousCategory.location_count * ratio ||
            Date.parse(options.datasetAt) <
              new Date(previousCategory.dataset_at).getTime()))
      )
        throw new AppError("SUSPICIOUS_IMPORT");
    }
    await db.query(
      "DELETE FROM facilities; INSERT INTO facilities(id,data,fee,location) SELECT id,data,fee,location FROM stage_category_locations WHERE category='toilets'; DELETE FROM settlements; INSERT INTO settlements SELECT * FROM stage_settlements; DELETE FROM dataset",
    );
    await db.query(
      "INSERT INTO dataset(dataset_at,source,facility_count,settlement_count,coverage) VALUES($1,$2,$3,$4,ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($5),4326)))",
      [
        options.datasetAt,
        options.source,
        counts.facilities,
        counts.settlements,
        coverage,
      ],
    );
    for (const category of categories) {
      await db.query(
        "INSERT INTO locations(id,location,tags) SELECT id,location,data->'tags' FROM stage_category_locations WHERE category=$1 ON CONFLICT(id) DO UPDATE SET location=EXCLUDED.location,tags=EXCLUDED.tags",
        [category],
      );
      await db.query("DELETE FROM location_categories WHERE category=$1", [
        category,
      ]);
      await db.query(
        "INSERT INTO location_categories(category,location_id,data,fee,seller_type) SELECT category,id,data,fee,data->>'sellerType' FROM stage_category_locations WHERE category=$1",
        [category],
      );
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
    if (categories.includes("transit")) {
      await db.query("DELETE FROM transit_components");
      await db.query(
        `INSERT INTO transit_components(location_id,group_id,kind,modes) SELECT id,data->'transit'->>'groupId',data->'transit'->>'kind',ARRAY(SELECT jsonb_array_elements_text(data->'transit'->'modes')) FROM stage_category_locations WHERE category='transit'`,
      );
    }
    await db.query(
      "DELETE FROM locations l WHERE NOT EXISTS(SELECT 1 FROM location_categories c WHERE c.location_id=l.id)",
    );
    await db.query(
      "UPDATE import_jobs SET status='success',finished_at=now(),facility_count=$2,settlement_count=$3,seller_count=$4,kebab_count=$5,water_count=$6,transit_count=$7 WHERE id=$1",
      [
        jobId,
        counts.facilities,
        counts.settlements,
        categories.includes("tobacco") ? counts.sellers : null,
        categories.includes("kebab") ? counts.kebabs : null,
        categories.includes("water") ? counts.waterPoints : null,
        categories.includes("transit") ? counts.transitStops : null,
      ],
    );
    await db.query("COMMIT");
    return counts;
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
}
