# ATM, Stay and Hungarian Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for shared integration; independent locale/artwork modules may use dispatching-parallel-agents. Record progress in the OpenSpec tasks and execution ledger.

**Goal:** Serve ATM and Stay in all four active countries and add Hungarian to all eight Bloli Nearby identities.

**Architecture:** Extend the existing category registry, shared national snapshots and site modules; no extra permanent services. Keep category filters server-side before limits and new import measurements non-publishing. Hungarian uses separate JSON dictionaries and the existing German fallback.

**Tech Stack:** TypeScript/React/Vite, Leaflet/Lucide, Node/PostGIS, Python/osmium, Docker Compose and Docker Nginx/Let's Encrypt.

**Spec:** `openspec/changes/atm-and-stay-sites/design.md` and `specs/*/spec.md`; owner approval includes Hungarian.

## Global Constraints

- DE/RO/AT/HU coverage; EN/DE/RO/HU languages with unsupported-browser German fallback.
- Keep 0.5 km default and 0.5/1/2/3/5 km choices, manual geolocation and existing map/list behavior.
- Preserve current six-site data, fast settlement search, secrets/source binaries outside Git, shared generic resources and existing ports.
- ATM mapped machine fees never promise zero personal card fees; missing hours never imply 24/7.
- Stay types: hotel, motel, guest_house, hostel, apartment, chalet, camp_site, caravan_site; no availability/price claims or Open now filter.
- Merge validated work into main and deploy from main; preserve backups and document VM changes. Stop temporary local services.

## Review Focus

- Embedded ATM host metadata/fee/hours must not become false machine facts; test standalone, embedded and separate mapping.
- Closed/private/conditional and cash-withdrawal=no ATM records must remain excluded; test precedence.
- Stay reception/check-in text must not turn into room availability; test type filters and forbidden filters.
- Partial eight-category imports must not overwrite existing country snapshots; test rollback, measurement and completeness.
- Hungarian must work for existing sites, unsupported browser fallback and long phone labels; verify every locale dictionary and mobile layout.

### Task 1: Discovery contracts and normalization

**Files:** `src/shared/{sites,types,domain,atm,accommodation,nearby-types}.ts`, `tests/{atm,accommodation}.test.ts`.
**Interfaces:** `normalizeAtm(SourceRecord): Facility|null`, `normalizeAccommodation(SourceRecord): Facility|null`; `Facility.atm` and `Facility.accommodation`; filters `currency`, `deposit`, `accommodationType` on `SearchQuery`.

- [ ] Add tests for affirmative evidence, lifecycle/access precedence, unknown properties, filter isolation and directions.
- [ ] Implement types/normalizers and scoped query parsing; currencies use explicit three-letter codes; deposits yes/no/unknown; embedded fields use ATM namespaces.
- [ ] Run targeted tests and TypeScript; resolve integration errors; commit.

### Task 2: Eight-category national imports

**Files:** `src/server/{category-imports,import,import-file,refresh-cli,country-activation,repository,schema}.ts/sql`, `src/shared/countries.ts`, `importer/{prepare.sh,extract.py,test_extract.py}`, `.env.example`, `compose.yaml`.
**Interfaces:** category registry adds `atm`/`accommodation`, counts `atms`/`accommodations`, national floor suffixes `ATMS`/`ACCOMMODATIONS`; `ImportOptions.measureOnly` returns normalized counts and rolls staging back.

- [ ] Add extractor/transactional tests for both kinds and failed/measurement imports.
- [ ] Extend filters, geometry kinds, metadata/completion categories, schema constraints, job counts, registry-derived activation completeness and national floors.
- [ ] Implement source reuse/pinning and measure-only CLI using normalizers/coverage without publication, plus safe missing-floor handling only for measurement.
- [ ] Run Python and PostGIS integration checks in a disposable local database; commit.

### Task 3: Hungarian dictionaries

**Files:** `src/web/locales/common/hu.json`, all `src/web/sites/*/locales/hu.json`, `src/web/i18n.ts`, `src/shared/types.ts`, shared name normalizers/import, `src/web/coverage.ts`, language selector and locale tests.
**Interfaces:** `Locale` adds `hu`; all `Record<Locale,...>` tables complete; Hungarian conjunction is `és` and OSM `name:hu` survives imports.

- [ ] Write actual Hungarian common and site copy in separate files; preserve every interpolation placeholder.
- [ ] Register locales and locale-sensitive formatting; validate key parity, `hu-HU` detection and German fallback.
- [ ] Run locale tests/build; commit.

### Task 4: Subject-specific UI modules

**Files:** new `src/web/sites/{atm,stay}/index.tsx` and four locale JSON files each; `src/web/sites/{index,types}.ts`, `src/web/{App,Details}.tsx`, `src/web/styles.css`.
**Interfaces:** existing `Icon/Artwork/Filters/Summary/DetailFields` exports; FilterProps adds `currency/onCurrency`, `deposit/onDeposit`, `accommodationType/onAccommodationType`.

- [ ] Apply frontend-design: ATM navy/mint cash-slip illustration; Stay cream/terracotta/dusk travel-journal illustration; shared navigational family, distinct subject content.
- [ ] Wire state/request filters and detail actions; label unknown facts and safe links; no Stay fee/hours toggle.
- [ ] Verify desktop and 320/390/430 px four-language flows, visible focus/reduced motion, driving Stay and walking ATM; commit.

### Task 5: Hosting, samples and regression gate

**Files:** `docker/gateway.conf`, `scripts/{build-site-shells,seed-sample,check-multi-site-production}.mjs/ts`, `deploy/nginx/*`, renewal hook, tests/e2e and docs.

- [ ] Add new production/local hosts and shell metadata, fixtures and renewal coverage.
- [ ] Extend live gates to eight sites/four countries/four languages and lightweight autocomplete checks.
- [ ] Run unit, build, importer, PostGIS and relevant browser checks once integrated; request fresh whole-branch review and address material findings.

### Task 6: Audited production release

**Files:** dated `docs/deployment/protocol-2026-10-29-atm-stay.md`, production configuration and existing shared volume.

- [ ] Record baseline identities/counts/timings/resources/source hashes; verify backup; pause refresh.
- [ ] Merge into main; push; deploy compatible images from main.
- [ ] Sequentially measure normalized eight-category snapshots from pinned retained DE/RO/AT/HU PBFs without publication; set independent new floors; publish and verify each.
- [ ] Verify existing site preservation/new data/borders; configure Docker Nginx/TLS; verify renewal hooks and eight-site live/mobile gate.
- [ ] Final backup/protocol, resume timer, sync main, cleanup merged feature branch and temporary local services.
