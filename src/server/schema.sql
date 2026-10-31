CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE TABLE IF NOT EXISTS dataset (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton), dataset_at timestamptz NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(), source text NOT NULL,
  facility_count integer NOT NULL, settlement_count integer NOT NULL, coverage geometry(MultiPolygon,4326) NOT NULL
);
CREATE TABLE IF NOT EXISTS facilities (
  id text PRIMARY KEY, data jsonb NOT NULL, fee text NOT NULL CHECK(fee IN ('free','paid','unknown')),
  location geography(Point,4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS facilities_location_idx ON facilities USING gist(location);
CREATE TABLE IF NOT EXISTS settlements (
  id text PRIMARY KEY, name text NOT NULL, postcode text, region text, names jsonb NOT NULL DEFAULT '{}',
  location geography(Point,4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS settlement_name_idx ON settlements USING gin(lower(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS settlement_postcode_idx ON settlements(postcode);
CREATE TABLE IF NOT EXISTS import_jobs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz, status text NOT NULL, source text NOT NULL, facility_count integer, settlement_count integer,
  error text
);

ALTER TABLE settlements ADD COLUMN IF NOT EXISTS place_type text;
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS source_version integer NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS settlement_centres_location_idx ON settlements USING gist(location) WHERE place_type IN ('city','town');

-- Additive multi-category schema. Legacy toilet tables remain rollback-compatible.
CREATE TABLE IF NOT EXISTS locations (
 id text PRIMARY KEY, location geography(Point,4326) NOT NULL, tags jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS locations_location_idx ON locations USING gist(location);
CREATE TABLE IF NOT EXISTS location_categories (
 category text NOT NULL CHECK(category IN ('toilets','tobacco','kebab')),
 location_id text NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
 data jsonb NOT NULL, fee text NOT NULL DEFAULT 'unknown', seller_type text,
 PRIMARY KEY(category,location_id)
);
CREATE INDEX IF NOT EXISTS location_categories_filter_idx ON location_categories(category,seller_type,fee);
CREATE TABLE IF NOT EXISTS category_datasets (
 category text PRIMARY KEY CHECK(category IN ('toilets','tobacco','kebab')),
 dataset_at timestamptz NOT NULL, imported_at timestamptz NOT NULL DEFAULT now(),
 source text NOT NULL, location_count integer NOT NULL, settlement_count integer NOT NULL,
 coverage geometry(MultiPolygon,4326) NOT NULL
);
-- Backfill only on first migration. Subsequent startup never rewrites active data.
INSERT INTO locations(id,location,tags)
 SELECT id,location,data->'tags' FROM facilities ON CONFLICT(id) DO NOTHING;
INSERT INTO location_categories(category,location_id,data,fee)
 SELECT 'toilets',id,data,fee FROM facilities ON CONFLICT(category,location_id) DO NOTHING;
INSERT INTO category_datasets(category,dataset_at,imported_at,source,location_count,settlement_count,coverage)
 SELECT 'toilets',dataset_at,imported_at,source,facility_count,settlement_count,coverage FROM dataset
 ON CONFLICT(category) DO NOTHING;
ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS seller_count integer;

-- Expand category checks in existing installations without rewriting active rows.
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='location_categories'::regclass AND conname='location_categories_category_check' AND pg_get_constraintdef(oid) NOT LIKE '%kebab%') THEN
  ALTER TABLE location_categories DROP CONSTRAINT IF EXISTS location_categories_category_check;
  ALTER TABLE location_categories ADD CONSTRAINT location_categories_category_check CHECK(category IN ('toilets','tobacco','kebab'));
 END IF;
 IF EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='category_datasets'::regclass AND conname='category_datasets_category_check' AND pg_get_constraintdef(oid) NOT LIKE '%kebab%') THEN
  ALTER TABLE category_datasets DROP CONSTRAINT IF EXISTS category_datasets_category_check;
  ALTER TABLE category_datasets ADD CONSTRAINT category_datasets_category_check CHECK(category IN ('toilets','tobacco','kebab'));
 END IF;
END $$;
ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS kebab_count integer;

-- Expand existing checks for the fourth profile without rewriting active rows.
ALTER TABLE location_categories DROP CONSTRAINT IF EXISTS location_categories_category_check;
ALTER TABLE location_categories ADD CONSTRAINT location_categories_category_check CHECK(category IN ('toilets','tobacco','kebab','water','transit','charge','atm','accommodation','view','sights','vending'));
ALTER TABLE category_datasets DROP CONSTRAINT IF EXISTS category_datasets_category_check;
ALTER TABLE category_datasets ADD CONSTRAINT category_datasets_category_check CHECK(category IN ('toilets','tobacco','kebab','water','transit','charge','atm','accommodation','view','sights','vending'));
ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS water_count integer;

-- Fifth shared profile and its raw component/context projection.
ALTER TABLE location_categories DROP CONSTRAINT IF EXISTS location_categories_category_check;
ALTER TABLE location_categories ADD CONSTRAINT location_categories_category_check CHECK(category IN ('toilets','tobacco','kebab','water','transit','charge','atm','accommodation','view','sights','vending'));
ALTER TABLE category_datasets DROP CONSTRAINT IF EXISTS category_datasets_category_check;
ALTER TABLE category_datasets ADD CONSTRAINT category_datasets_category_check CHECK(category IN ('toilets','tobacco','kebab','water','transit','charge','atm','accommodation','view','sights','vending'));
ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS transit_count integer;
CREATE TABLE IF NOT EXISTS transit_components (
 location_id text PRIMARY KEY REFERENCES locations(id) ON DELETE CASCADE,
 group_id text,kind text NOT NULL CHECK(kind IN ('station','platform','entrance','stop','position')),
 modes text[] NOT NULL
);
CREATE INDEX IF NOT EXISTS transit_components_group_idx ON transit_components(group_id);
CREATE INDEX IF NOT EXISTS transit_components_modes_idx ON transit_components USING gin(modes);

CREATE INDEX IF NOT EXISTS transit_components_logical_idx ON transit_components((COALESCE(group_id,location_id)));

ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS charge_count integer;

-- Country snapshots and source membership are additive: the current German
-- rows remain the canonical shared OSM identities and are backfilled below.
ALTER TABLE location_categories ADD COLUMN IF NOT EXISTS source_version integer NOT NULL DEFAULT 0;
ALTER TABLE locations ADD COLUMN IF NOT EXISTS source_version integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS countries (
 code text PRIMARY KEY CHECK(code IN ('de','ro','at','hu')),
 name text NOT NULL,
 timezone text NOT NULL,
 status text NOT NULL CHECK(status IN ('active','pending')),
 rollout_order integer NOT NULL,
 boundary_source text,
 boundary_checksum text CHECK(boundary_checksum IS NULL OR boundary_checksum ~ '^[0-9a-fA-F]{64}$')
);
INSERT INTO countries(code,name,timezone,status,rollout_order) VALUES
 ('de','Germany','Europe/Berlin','active',0),
 ('ro','Romania','Europe/Bucharest','pending',1),
 ('at','Austria','Europe/Vienna','pending',2),
 ('hu','Hungary','Europe/Budapest','pending',3)
ON CONFLICT(code) DO NOTHING;

CREATE TABLE IF NOT EXISTS country_datasets (
 country_code text NOT NULL REFERENCES countries(code),
 category text NOT NULL CHECK(category IN ('toilets','tobacco','kebab','water','transit','charge','atm','accommodation','view','sights','vending')),
 dataset_at timestamptz NOT NULL,
 imported_at timestamptz NOT NULL DEFAULT now(),
 source text NOT NULL,
 source_checksum text CHECK(source_checksum IS NULL OR source_checksum ~ '^[0-9a-fA-F]{32}$'),
 location_count integer NOT NULL,
 settlement_count integer NOT NULL,
 coverage geometry(MultiPolygon,4326) NOT NULL,
 boundary_source text NOT NULL,
 boundary_checksum text CHECK(boundary_checksum IS NULL OR boundary_checksum ~ '^[0-9a-fA-F]{64}$'),
 PRIMARY KEY(country_code,category)
);
CREATE TABLE IF NOT EXISTS country_location_memberships (
 country_code text NOT NULL REFERENCES countries(code),
 category text NOT NULL,
 location_id text NOT NULL,
 source_version integer NOT NULL DEFAULT 0 CHECK(source_version >= 0),
 PRIMARY KEY(country_code,category,location_id),
 FOREIGN KEY(category,location_id) REFERENCES location_categories(category,location_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS country_location_membership_lookup_idx
 ON country_location_memberships(category,country_code,location_id);
CREATE TABLE IF NOT EXISTS country_settlement_memberships (
 country_code text NOT NULL REFERENCES countries(code),
 settlement_id text NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
 source_version integer NOT NULL DEFAULT 0 CHECK(source_version >= 0),
 PRIMARY KEY(country_code,settlement_id)
);
CREATE INDEX IF NOT EXISTS country_settlement_membership_lookup_idx
 ON country_settlement_memberships(settlement_id,country_code);

-- Existing live data belongs to Germany. Do not rewrite locations, JSON or IDs.
INSERT INTO country_datasets(country_code,category,dataset_at,imported_at,source,location_count,settlement_count,coverage,boundary_source,boundary_checksum)
 SELECT 'de',category,dataset_at,imported_at,source,location_count,settlement_count,coverage,
        'https://download.geofabrik.de/europe/germany.poly',NULL
 FROM category_datasets ON CONFLICT(country_code,category) DO NOTHING;
INSERT INTO country_location_memberships(country_code,category,location_id,source_version)
 SELECT 'de',lc.category,lc.location_id,lc.source_version
 FROM location_categories lc
 JOIN country_datasets d ON d.country_code='de' AND d.category=lc.category
 JOIN locations l ON l.id=lc.location_id
 WHERE ST_Covers(d.coverage,l.location::geometry)
 ON CONFLICT(country_code,category,location_id) DO NOTHING;
INSERT INTO country_settlement_memberships(country_code,settlement_id,source_version)
 SELECT 'de',s.id,0
 FROM settlements s
 JOIN country_datasets d ON d.country_code='de' AND d.category='toilets'
 WHERE ST_Covers(d.coverage,s.location::geometry)
 ON CONFLICT(country_code,settlement_id) DO NOTHING;

ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS country_code text REFERENCES countries(code) DEFAULT 'de';
UPDATE import_jobs SET country_code='de' WHERE country_code IS NULL;
ALTER TABLE import_jobs ALTER COLUMN country_code SET DEFAULT 'de';
ALTER TABLE import_jobs ALTER COLUMN country_code SET NOT NULL;
CREATE INDEX IF NOT EXISTS import_jobs_country_recent_idx ON import_jobs(country_code,id DESC);

CREATE EXTENSION IF NOT EXISTS unaccent;

-- Persist the accent-folded key so place autocomplete can use a prefix index.
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS search_name text;
UPDATE settlements SET search_name=unaccent(lower(name)) WHERE search_name IS NULL;
CREATE INDEX IF NOT EXISTS settlement_search_name_prefix_idx
 ON settlements(search_name text_pattern_ops);
CREATE OR REPLACE FUNCTION set_settlement_search_name() RETURNS trigger
 LANGUAGE plpgsql AS $$
BEGIN
 NEW.search_name := unaccent(lower(NEW.name));
 RETURN NEW;
END;
$$;
DO $$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM pg_trigger
  WHERE tgrelid='settlements'::regclass AND tgname='settlement_search_name_write'
 ) THEN
  CREATE TRIGGER settlement_search_name_write
   BEFORE INSERT OR UPDATE OF name ON settlements
   FOR EACH ROW EXECUTE FUNCTION set_settlement_search_name();
 END IF;
END;
$$;

ALTER TABLE country_datasets DROP CONSTRAINT IF EXISTS country_datasets_category_check;
ALTER TABLE country_datasets ADD CONSTRAINT country_datasets_category_check CHECK(category IN ('toilets','tobacco','kebab','water','transit','charge','atm','accommodation','view','sights','vending'));
ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS atm_count integer;
ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS accommodation_count integer;

ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS view_count integer;
ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS sights_count integer;

ALTER TABLE import_jobs ADD COLUMN IF NOT EXISTS vending_count integer;
