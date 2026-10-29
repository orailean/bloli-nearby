## 1. Resolve implementation foundations

- [x] 1.1 Verify the opening-hours library's mixed-timezone behavior and choose/test a free timezone-safe adapter without per-request process TZ mutation.
- [x] 1.2 Select and record versioned country-boundary provenance; verify physical-country assignment against Geofabrik border buffers.
- [x] 1.3 Verify OSM version propagation through filtering/extraction and define deterministic overlapping-payload reconciliation with conflict diagnostics.
- [x] 1.4 Add the validated DE/RO/AT/HU registry with source URLs, timezone configuration and independently configurable category floors; keep AT/HU pending until Romania passes its production gate.

## 2. Country-scoped storage and imports

- [x] 2.1 Add rerunnable country snapshot, membership/provenance and settlement migrations; backfill existing German data without changing counts or public IDs.
- [x] 2.2 Isolate retained sources, checksums, filters and completion files by country; support verified legacy Germany-source reuse.
- [x] 2.3 Extend extraction records with source version, country assignment and timezone context while preserving all six category classifiers and geometry validation.
- [x] 2.4 Implement atomic per-country staging/publication with independent floors, count-drop/source-time checks and rejection of incomplete category sets.
- [x] 2.5 Reconcile overlapping source contributions under shared locking; deduplicate active results and preserve identities retained by another country.
- [x] 2.6 Add isolated PostGIS regressions for DE backfill, RO-first import, gated AT/HU follow-on imports, failures, country replacement, duplicate identities, conflicting versions and deletion retention.

## 3. Discovery and local-time behavior

- [x] 3.1 Extend status APIs with per-country readiness, pending/active state, dates, counts and refresh results plus conservative compatible aggregate metadata.
- [x] 3.2 Add country-aware settlement responses/filter validation and accented/unaccented Romanian name matching with ambiguous-name/postcode fixtures.
- [x] 3.3 Query combined active national coverage with deduplicated border results before result limits; retain category isolation and radius contracts.
- [x] 3.4 Implement country/subdivision/timezone-aware Open now and cache keys; preserve machine defaults and unknown holiday behavior.
- [x] 3.5 Verify mixed-country schedules at one UTC instant, holidays, midnight and DST boundaries independently of server timezone and request order.

## 4. Interface and native development

- [x] 4.1 Add the accessible optional country selector for settlement search, default all countries; distinguish country labels without restricting nearby border results.
- [x] 4.2 Replace Germany-only copy/metadata and add country update details in separate DE/EN/RO files across all six site identities; retain German fallback and keep Hungarian UI out of scope.
- [x] 4.3 Extend the guarded native local seed with small synthetic DE/RO/AT/HU category/settlement/border examples and document Docker-only DB debugging.
- [x] 4.4 Verify desktop and 320/390/430 px phone flows in all languages: selector, suggestions, radius, map/list, details, country dates, keyboard access and overflow.

## 5. Refresh automation and operating instructions

- [x] 5.1 Add sequential configured-country refresh and targeted retry commands with shared locking, per-country outcomes, continuation after failure and nonzero partial-failure exit.
- [x] 5.2 Update storage, refresh timer, update, backup/restore and rollback documentation, including the old global-importer incompatibility and country cache paths.
- [x] 5.3 Extend production verification to all four country configurations and six sites, source dates, mixed-zone Open now, pending countries and border isolation; run relevant unit/importer/PostGIS/browser/build checks.

## 6. Controlled production rollout

- [x] 6.1 Record current VM resources/counts/IDs/source dates/timers, take and verify a backup, and save private configuration before migration.
- [x] 6.2 Deploy compatible country support with refresh paused; migrate/backfill DE and verify unchanged German identities/counts and retained generic resource bindings across all six sites.
- [x] 6.3 Download and verify Romania, measure all six category counts/resources, set Romanian floors and publish its snapshot independently with logs and completion evidence.
- [x] 6.4 Validate the Romania release gate: Munich and Bucharest on all six sites, Romanian boundaries, timezone/holiday handling, DE/EN/RO mobile UI, APIs, tiles, Germany preservation, backup and refresh retry; keep AT/HU pending if any check fails.
- [x] 6.5 After Romania passes the gate, download and publish Austria, verify it, then download and publish Hungary; measure separate floors/resources and retain independent rollback per country.
- [x] 6.6 Verify all four countries in Munich, Bucharest, Vienna and Budapest, including DE/AT, AT/HU and HU/RO borders; take/verify final backup, confirm targeted and scheduled refresh, then resume/check the systemd timer.
- [x] 6.7 Save dated VM protocols for the staged activations with exact paths, counts, sizes, source dates and results; commit/push source-only work, synchronize production and stop local debug services while preserving local data.
