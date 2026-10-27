## 1. Resolve implementation foundations

- [ ] 1.1 Verify the opening-hours library's mixed-timezone behavior and choose/test a free timezone-safe adapter without per-request process TZ mutation.
- [ ] 1.2 Select and record versioned country-boundary provenance; verify physical-country assignment against Geofabrik border buffers.
- [ ] 1.3 Verify OSM version propagation through filtering/extraction and define deterministic overlapping-payload reconciliation with conflict diagnostics.
- [ ] 1.4 Add the validated DE/AT/RO registry with source URLs, timezone configuration and independently configurable category floors.

## 2. Country-scoped storage and imports

- [ ] 2.1 Add rerunnable country snapshot, membership/provenance and settlement migrations; backfill existing German data without changing counts or public IDs.
- [ ] 2.2 Isolate retained sources, checksums, filters and completion files by country; support verified legacy Germany-source reuse.
- [ ] 2.3 Extend extraction records with source version, country assignment and timezone context while preserving all three category classifiers and geometry validation.
- [ ] 2.4 Implement atomic per-country staging/publication with independent floors, count-drop/source-time checks and rejection of incomplete category sets.
- [ ] 2.5 Reconcile overlapping source contributions under shared locking; deduplicate active results and preserve identities retained by another country.
- [ ] 2.6 Add isolated PostGIS regressions for DE backfill, AT/RO first imports, failures, country replacement, duplicate identities, conflicting versions and deletion retention.

## 3. Discovery and local-time behavior

- [ ] 3.1 Extend status APIs with per-country readiness, dates, counts and refresh results plus conservative compatible aggregate metadata.
- [ ] 3.2 Add country-aware settlement responses/filter validation and accented/unaccented Romanian name matching with ambiguous-name/postcode fixtures.
- [ ] 3.3 Query combined active national coverage with deduplicated border results before result limits; retain category isolation and radius contracts.
- [ ] 3.4 Implement country/subdivision/timezone-aware Open now and cache keys; preserve machine defaults and unknown holiday behavior.
- [ ] 3.5 Verify mixed-country schedules at one UTC instant, holidays, midnight and DST boundaries independently of server timezone and request order.

## 4. Interface and native development

- [ ] 4.1 Add the accessible optional country selector for settlement search, default all countries; distinguish country labels without restricting nearby border results.
- [ ] 4.2 Replace Germany-only copy/metadata and add country update details in separate DE/EN/RO files across all three site identities; retain German fallback.
- [ ] 4.3 Extend the guarded native local seed with small synthetic DE/AT/RO category/settlement/border examples and document Docker-only DB debugging.
- [ ] 4.4 Verify desktop and 320/390/430 px phone flows in all languages: selector, suggestions, radius, map/list, details, country dates, keyboard access and overflow.

## 5. Refresh automation and operating instructions

- [ ] 5.1 Add sequential configured-country refresh and targeted retry commands with shared locking, per-country outcomes, continuation after failure and nonzero partial-failure exit.
- [ ] 5.2 Update storage, refresh timer, update, backup/restore and rollback documentation, including the old global-importer incompatibility and country cache paths.
- [ ] 5.3 Extend production verification to all three countries/sites, source dates, mixed-zone Open now and border isolation; run relevant unit/importer/PostGIS/browser/build checks.

## 6. Controlled production rollout

- [ ] 6.1 Record current VM resources/counts/IDs/source dates/timers, take and verify a backup, and save private configuration before migration.
- [ ] 6.2 Deploy compatible country support with refresh paused; migrate/backfill DE and verify unchanged German identities/counts and retained generic resource bindings.
- [ ] 6.3 Download and verify AT/RO extracts, measure counts and resource usage, set country floors and publish each independently with logs and completion evidence.
- [ ] 6.4 Verify Munich/Vienna/Bucharest, DE/AT border and per-country statuses publicly on all sites; verify backup and targeted refresh behavior, then resume/check systemd scheduling.
- [ ] 6.5 Save a dated VM protocol with exact changes, paths, counts and results; commit/push source-only work, synchronize production and stop local debug services while preserving local data.
