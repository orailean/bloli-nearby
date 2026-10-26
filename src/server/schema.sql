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
