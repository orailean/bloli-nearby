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
