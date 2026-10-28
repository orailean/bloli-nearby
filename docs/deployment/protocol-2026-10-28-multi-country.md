# Multi-country production rollout protocol

## Preflight and rollback point

Date: 2026-10-28. Production host: Contabo VM `vmd34296`, checkout `/home/oliver/stack/bloli-nearby`. This protocol records the controlled DE → RO → AT → HU rollout. Do not activate Austria before Romania's release gate passes, or Hungary before Austria is verified.

Before the schema change, production was at revision `1793309e718dbc72a39a5b1e31e441e2a664988b`; six public site containers (API, web and PostGIS) were healthy. The VM had 8 CPUs, 29 GiB RAM (18 GiB available) and 524 GiB free on `/`. The import volume occupied 6.7 GiB and retained the verified 4.6 GB Germany source at `/data/source.osm.pbf` plus the 260 MB Transit context file. Docker volumes remain `bloli-nearby_import_data` and `bloli-nearby_postgres_data`, mounted under `/var/lib/docker/volumes/`.

Pre-migration category snapshots all used Germany source `https://download.geofabrik.de/europe/germany-261025.osm.pbf`, timestamp `2026-10-25T21:21:21Z`:

| Category | Count | Sorted identity checksum |
| --- | ---: | --- |
| Toilets | 25,954 | `97cbe8a7ed9b30e20738e931986c5816` |
| Tobacco | 107,861 | `f45592e1d1a0a7319c01d08740529b48` |
| Kebab | 11,267 | `a1fc7f2628821463d5cd7a7c691db4c4` |
| Water | 14,620 | `b54a61e958a9d7955676e17f21a97e06` |
| Transit | 799,433 | `709ef24fa5a8399dc445b12d5758e4ad` |
| Charge | 40,401 | `ba19a9b5a7fecc650f5c8600dd3beb3f` |
| Settlements | 196,951 | `5b3a3db6d7f5dac0ad498fc89f3df492` |

The shared `locations` table contained 998,609 distinct OSM identities before migration. Fingerprints are MD5 of sorted semicolon-joined IDs from each category's `location_categories` membership (and settlement IDs for the last row); use the same query when comparing the German backfill.

The existing `bloli-nearby-refresh.timer` was active, with its next run on 2026-11-01. No importer was running. The timer was stopped before the backup/migration and the refresh service was confirmed inactive. The daily backup timer was not changed.

Verified rollback point: `/home/oliver/stack/bloli-nearby/backups/bloli-nearby-20261028T124309Z.dump`, 207,797,227 bytes, SHA-256 `22831f84afe9c75ba68b2bf0ea9174ce4fe63661157043b2c5e79f405297743b`. `pg_restore --list` succeeded inside the running PostGIS container. Private configuration copies were saved mode `0600` as `backups/env-before-multicountry-20261028T124309Z` and `backups/compose-before-multicountry-20261028T124309Z.yaml`; these files are ignored and must never enter Git.

## Implementation and verification

The source implementation, checks and country-specific rollback/update instructions are being deployed from feature branch `feat/multi-country-coverage`. No PBF, database dump, environment file or generated asset is part of the Git change. Local checks: TypeScript/production build passed; 72 unit tests, 41 importer tests, 17 PostGIS integration checks, and 38 Playwright browser checks passed. The synthetic seed includes all four countries and a shared DE/AT border identity; its isolated database check found two country memberships for `node/9900000`.

## Live rollout results

Fill this section after each completed stage. Record source URL/checksum/timestamp, retained PBF size, all six category and settlement counts, import duration/peak resources, backup path/checksum, public checks on all six sites, and timer state. Keep uncompleted countries marked pending.

### Germany schema backfill

Pending.

### Romania activation gate

Pending.

### Austria activation

Pending.

### Hungary activation

Pending.

### Final refresh and backup verification

Pending.
