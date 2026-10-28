# Place search performance, 2026-10-28

Production checkout: `/home/oliver/stack/bloli-nearby`, branch `feat/multi-country-coverage`. All six sites share the API and PostGIS database.

Measured public place autocomplete before the change: `mun`, `mün`, `bucuresti` and `bu` took about 2.4–2.8 seconds. Nearby location queries around Munich took about 0.2–1.1 seconds. The status endpoint took about 0.25 seconds.

Added a stored accent-folded settlement name, a prefix index and a settlement-ID membership index. A database trigger maintains the name key when imports insert/update names. The API normalizes the small input string rather than computing `unaccent(lower(name))` for every stored row. German and Romanian accent-insensitive lookup and postcode ranking are retained.

The production execution plan then exposed stale country statistics: the planner estimated about 13 membership rows but processed 282,177, making an indexed settlement lookup for every membership. Ran `ANALYZE` on `countries`, `country_datasets`, `country_settlement_memberships` and `settlements`. Added all country metadata/membership tables to routine post-import statistics maintenance.

Measured public responses afterward: `mun` warmed to 0.40–0.48 seconds; `mün` 0.37–0.41 seconds; `bucuresti` 0.30–0.37 seconds; two-character `bu` 0.64–0.71 seconds. These include network time and are samples, not latency guarantees.

Verified backup before migration: `backups/bloli-nearby-20261028T173807Z.dump`, 263,607,375 bytes, SHA-256 `64b23d885a0a32e37156c87322691db87ff341491a5b6f5556eb2829b3ef6ee0`; `pg_restore --list` returned 96 entries. API and importer images were rebuilt. The API migration completed and its health check passed.

Validation: production build, 78 unit tests and 17 PostGIS integration checks passed. Integration checks used only disposable local database `bloli_nearby_perf_20261028`; it was dropped afterward and the local development database container was stopped. Existing local development/integration databases and volumes were preserved.
