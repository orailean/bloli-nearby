# Water Site Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Launch water.bloli.com for mapped drinking-water and refill points.
**Architecture:** Extend shared category/profile/import registries and site presentation. Reuse one database, retained Germany PBF, web/API/importer, Docker Nginx and ACME infrastructure.
**Tech Stack:** TypeScript, React, Lucide, Leaflet, PostGIS, Python/pyosmium, Docker Compose.
**Spec:** openspec/changes/water-site/design.md (owner approved 2026-10-27).

## Global Constraints

DE/EN/RO separate files; German fallback; 0.5 km default; radii 0.5/1/2/3/5 km; native API/Vite with Docker-only DB; no binaries/secrets in Git; no new production ports/permanent services; country expansion stays on hold.

## Review Focus

- Contradictory potability/access/fee tags must not advertise unsafe or private water.
- Seasonal daily-only schedules must not imply winter availability.
- Same OSM identity in multiple categories must retain coherent geometry and publication.
- All languages fit 320 px screens and map/list remain synchronized.
- Four-category refresh and TLS renewal must preserve existing three sites.

### Task 1: Water data contract
**Files:** src/shared/water.ts, types.ts, sites.ts, domain.ts; src/server/opening-hours.ts; tests/water.test.ts.
**Interfaces:** normalizeWater(SourceRecord): Facility|null; Facility.waterType/bottle/seasonal/refillNetwork; category water; isOpenNow accepts water category context.
- [x] Write normalization/host/filter/seasonal tests, run red, implement conservative classification and mapped fields, run green plus npm test.

### Task 2: Four-category extraction/publication
**Files:** importer/extract.py, prepare.sh, test_water.py; src/server/category-imports.ts, import.ts, import-file.ts, schema.sql; compose.yaml; tests/integration/api.test.ts.
**Interfaces:** kind water; category water; minimumWaterPoints; counts.waterPoints; import_jobs.water_count.
- [x] Write extraction and fourth-category isolation/rollback tests and observe red; extend candidate prefilter, normalization registry, additive checks and count environment; run importer/PostGIS/unit tests green.

### Task 3: Water presentation and native fixtures
**Files:** src/web/sites/water/index.tsx and locales/*.json, sites/index.ts, i18n.ts, styles.css; scripts/build-site-shells.mjs, seed-sample.ts; docker/gateway.conf; vite.config.ts; public/favicon-water.svg; tests/e2e/multi-site.spec.ts; tests/fixtures/multi-site.jsonl.
**Interfaces:** same Icon/Artwork/Filters/Summary/DetailFields module as existing sites; dictionary additions for mapped Water details; fourth initial HTML shell.
- [x] Extend locale/host/browser behavior tests first; build original artwork/theme/locales and host integration; add small samples and verify all unit/build/Chromium/WebKit layouts with screenshots.

### Task 4: Review and rollout
**Files:** deploy/nginx/water.bloli.com.*.conf; scripts/check-multi-site-production.mjs; README.md; docs/deployment/water-site.md and dated actual VM protocol.
- [x] Add shared-proxy vhosts and update docs/checks. Run a fresh whole-change review, fix important findings with regressions and rerun relevant suites.
- [ ] Commit/push approved feature; snapshot VM counts/config/images and verify backup; build images, deploy compatible API/web, import retained same-source Germany data with four categories and verify counts/backups.
- [ ] Issue Water TLS with existing webroot/account, extend shared renewal hook, test/gracefully reload Nginx, verify four-site public behavior and all renewal dry-runs; record exact protocol and synchronize final source-only commit.
- [ ] Stop local debug services and completed production helpers, retaining data and old rollback volumes.
