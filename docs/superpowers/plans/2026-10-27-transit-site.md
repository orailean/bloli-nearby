# Transit Implementation Plan

> Execute inline with superpowers:executing-plans; use a fresh whole-change review before deployment.

**Goal:** Launch transit.bloli.com for nearest mapped passenger stops, grouped interchanges and mode filtering.
**Architecture:** Extend shared category/profile registries. SQLite-backed source-bound transport relation context enriches raw locations; additive PostGIS transport components project logical grouped results. Five categories/context publish in one transaction.
**Spec:** openspec/changes/transit-site/design.md, approved by owner2026-10-27.
**Constraints:** Germany only; rail/bus/taxi/ferry/cable scope; no live service claims; no paid APIs/new permanent containers/ports; retain generic volumes; DE/EN/RO and German fallback;0.5km default with0.5/1/2/3/5km; no binaries/secrets in Git.

## Review focus

Explicit negatives beat enrichment; S-Bahn proof distinct from light rail; ambiguous parents stay ungrouped; radius/group/limit apply in correct order; entrance/platform provenance and unsafe stop-position directions; route metadata never imports national path geometry; all existing sites and atomic refresh survive.

## Tasks

- [x] 1. Write tests RED for modes/lifecycle/access/source contexts/filter validation. Implement `normalizeTransit(SourceRecord):Facility|null` and shared Transit types/profile/query capabilities. GREEN full unit suite.
- [x] 2. Write Python context/extraction regressions RED, implement `transit_context.py` with bounded SQLite metadata/membership joins and checksum-bound preparation. Include all passenger modes, explicit stop_area parent context and source evidence, no route path recursion. GREEN importer suite and real retained-source München/Berlin/Hamburg evidence probe.
- [x] 3. Add `transit_components` keyed raw location ID with group/modes/kind/context, publish atomically from staged JSON. Implement grouped SQL: preferred mapped public entrance/platform eligibility per mode before radius/group ordering/limit; raw fallback only without suitable mapped group components. Expose stable group ID plus chosen component, member details, source evidence and directions eligibility. Real PostGIS tests RED→GREEN for five categories/group boundaries/rollback/host isolation.
- [x] 4. Extend site presentation interfaces with mode control, capability-aware Open now and per-item directions. Build original Transit artwork/theme, separate translations, initial shell/native/gateway host and fixture. Verify build, all-host Chromium/WebKit at desktop/320/390/430, screenshot and keyboard behavior.
- [x] 5. Fresh whole-change review; regress important findings RED→GREEN, run appropriate final unit/Python/PostGIS/browser/build checks. Update native/deployment docs, Nginx templates and all-site production verification. Commit/push approved feature.
- [x] 6. VM preflight verified backup, build/readability smoke, compatible app deploy, source reuse five-category import and atomic validation/count comparisons, verified post-backup. TLS/renewal fifth domain, public modes/grouping/languages/mobile/tiles checks; resume timers, record actual protocol, commit/push/sync docs and stop local debugging/clean completed helpers.
