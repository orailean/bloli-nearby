# Kebab Site Implementation Plan

> **For agentic workers:** Use executing-plans for core integration and dispatching-parallel-agents for independent frontend and extraction modules; finish with a fresh whole-change review.

**Goal:** Deploy the approved Kebab experience on kebab.bloli.com using the existing shared platform.
**Architecture:** One typed host profile/category, registry-driven category staging and atomic publication, shared PostGIS/search, independent presentation/locales, existing Docker Nginx/TLS infrastructure.
**Tech Stack:** TypeScript/React/Vite, Node/pg/PostGIS, Python/osmium/Shapely, Docker Compose/Nginx/Certbot.
**Spec:** openspec/changes/kebab-site/design.md and specs/*/spec.md.

## Global Constraints
- Germany; shared services/database; retain production resource bindings, ports and schedules.
- Separate DE/EN/RO files; unsupported browser languages default to German.
- 0.5 km default, 0.5/1/2/3/5 km choices, Open now; unknown food hours never become 24/7.
- Explicit fixed restaurant/fast_food cuisine tokens kebab/doner/doener/döner; semicolon/case handling; exclude inaccessible/inactive and name-only/Turkish-only inference.
- No binaries/data/secrets in Git; stop local debug/test services after checks.
- Approved white/aubergine/saffron takeaway design, locally bundled free Rubik, original SVG, restrained action-triggered motion and reduced motion.

## Review Focus
- Same source in three categories must not leak or drop memberships.
- Omitting active categories or malformed minimum thresholds must fail safely.
- Food menu/website values must never create unsafe links or inferred dietary claims.
- New food relations must preserve valid fixed geometry or fail before publication.
- Real long names and DE/RO copy must fit phones without horizontal overflow.

## Task 1: Shared food contract, classification and search
Files: src/shared/{sites,types,domain,kebab}.ts, tests/{kebab,sites,domain}.test.ts.
Produces: SiteId/Category include kebab; normalizeKebab(SourceRecord): Facility|null; optional Facility cuisine:string[], takeaway:string|null, delivery:string|null, dietary:Record<string,string>, website/menuUrl:string|null. Existing common fields/paymentMethods reused.
- [ ] Add failing tests for cuisine aliases/case/multi-values, restriction/lifecycle, unknown hours, invalid URLs, duplicate query filters and third-host resolution.
- [ ] Implement the contract and classifier; profile capabilities fee=false,sellerType=false,openNow=true; reject incompatible Kebab filters while preserving old host behavior.
- [ ] Run npm test and TypeScript checks; commit shared contract when integrated.

## Task 2: Three-category ingestion and schema
Files: src/server/{import,import-file}.ts, schema.sql, compose.yaml, scripts/seed-sample.ts, tests/integration/api.test.ts, tests/fixtures/multi-site.jsonl.
Consumes normalizeKebab plus existing normalizers. Python kind=kebab maps category=kebab. Metadata categories lists all three for new full source. Existing two-category fixtures remain supported until third activation.
- [ ] Add integration tests for rerunnable migration, first third-category import, dual memberships, unknown/duplicate categories, partial replacement rejection and failed threshold/date/completion preservation.
- [ ] Implement generic stage_category_locations keyed by category/id, per-category normalizer registry/minimums and active-category completeness. Keep legacy WC dataset/facilities synchronized transactionally; update import_jobs kebab_count and result kebabs.
- [ ] Validate minimumKebabs/MIN_KEBABS independently; initial default 100 until retained-source measurement. Reject non-finite/out-of-range thresholds.
- [ ] Extend the synthetic sample and run isolated PostGIS suite using a disposable local database. Stop DB afterward.

## Task 3: Streaming extraction (independent module)
Files: importer/extract.py, prepare.sh, test_kebab.py and existing importer tests as required.
Consumes approved cuisine policy; emits kind=kebab and metadata categories=[toilets,tobacco,kebab].
- [ ] Write failing Python classification/geometry/dual-membership/completion tests, including building/site/multipolygon and absent geometry.
- [ ] Implement candidate predicate and strict geometry validation; add broad cuisine prefilter while normalizer enforces exact tokens and venue type. Preserve filter cache invalidation and source reuse.
- [ ] Run all Python tests, report exact contract and evidence; do not edit shared/backend/frontend files.

## Task 4: Kebab presentation and build routing (independent module)
Files: src/web/, public/favicon-kebab.svg, scripts/build-site-shells.mjs, vite.config.ts, docker/gateway.conf, package.json/lock, THIRD_PARTY_NOTICES.md, tests/e2e and translation tests.
Consumes shared contract above; registry site.id/category=kebab, site.domain=kebab.bloli.com. Kebab module follows existing exports and shared interactions.
- [ ] Add failing translation/three-host UI checks and safe food detail assertions.
- [ ] Build approved theme/artwork/header/footer/hero and separated locales, optional mapped detail fields and safe menu/website links; locally bundle Rubik and respect reduced motion.
- [ ] Extend initial shells/gateway/native development host routing, use profile domain metadata and third-site favicon; preserve Loo/Kippe behavior.
- [ ] Run build plus desktop/320/390/430 all-language screenshot/browser checks; use mocked API for independent UI checks and stop temporary Vite. Do not change shared/backend/importer files.

## Task 5: Integration, review and operations
Files: deployment docs/configs/hooks, production verification scripts, dated protocol and OpenSpec task checkboxes.
- [ ] Run integrated unit/Python/PostGIS/build/proxy/browser suites and inspect screenshots. Fresh reviewer examines full change against spec; fix important findings with tests and record decisions.
- [ ] Record VM baseline and verified backup; merge reviewed source to main, push and sync. Build API/web/importer and deploy compatible schema.
- [ ] Run retained-source three-category import, verify counts and measured minimum, readiness/isolation and old-category retention. Preserve logs and post-import backup.
- [ ] DNS must point kebab.bloli.com A to 173.212.194.159 without conflicting AAAA. Prepare shared Docker Nginx HTTP challenge, use existing Certbot account/webroot, update hook and install validated HTTPS vhost only after readiness.
- [ ] Verify live all-three-host metadata, categories, details, tiles, directions, radii, locales/phone widths and renewal dry runs. Save actual protocol, commit/push documentation, sync and verify no local debug services or unnecessary exited helpers remain.
