# Implementation record

Plan: docs/implementation/plan.md. Started 2026-10-26.

- Baseline: documentation-only folder, no Git repository, no existing tests. Local Node 22.17.1 and Docker 29.1.3 available. No remote mutations authorized or performed.
- Proposed UI defaults extended by user: Lucide icons, playful restrained motion, branded header/footer; respect prefers-reduced-motion.
- Interfaces: normalized facilities and settlement records are shared by importer/API/UI through src/shared/types.ts. API responses contain stable error codes translated by the frontend.

- Domain tests: 5 expected failures before implementation, then 5 passed.
- PostGIS/API integration: 6 contract subtests initially failed against stubs; implemented transactions, advisory locks, source deduplication, minimum counts/ratios, spatial search, coverage and lookup. Verified against separate local PostGIS container; no production data involved.

- Installed project-only design skills via the skill-installer Git method after the Python download method hit a local certificate-store error. Paths: `.agents/skills/frontend-design` and `.agents/skills/web-design-guidelines`. Nothing installed globally.
- Extractor: 4 Python tests pass, including nodes, ways, multipolygon relations, invalid toilet geometry, clipped settlement geometry, and polygon holes. The real Bremen trial produced 369 candidate facilities and 284 settlements; conservative normalization plus Germany coverage retained 246 eligible facilities and 204 settlements in the development database.
- Measured unfiltered Bremen extraction: see extraction-sample.json. 21,244,759-byte input; 62.02 s wall time, 141,770,752-byte peak RSS on local macOS while Docker builds also ran. Full Germany has NOT been benchmarked. Configured importer limits (2 CPUs/4 GiB) and initial 30 GB headroom are provisional, requiring full-country verification before deployment.
- Browser RED→GREEN: four behavioral browser tests initially failed against the UI stub. Implemented live local search/filter/details/directions, language persistence, denied location, blocked storage, mobile layout, and missing-bootstrap handling. All four passed after fixing the mobile decorative overflow and adding a regression test for visible map attribution (observed fail, then pass).
- Build: TypeScript and Vite production build passed. Replaced the nested generic declaration reported by the owner's IDE with `Facility['names']`; fresh TypeScript check passed.
- Local Compose: API/gateway/importer images build successfully. Fixed database readiness to check TCP, avoiding the temporary Unix-socket-only bootstrap server. App startup without data was verified to return ready=false; the UI does not claim an empty German toilet dataset.


## Final implementation review and verification

- Fresh independent review completed. Six material findings were fixed: production Compose-file preservation during restore, whole-refresh lifecycle/abandoned job reporting, stale geolocation, ambiguous settlement labels, map position across locale changes, and keyboard marker focus. Regression tests cover all six; keyboard activation was also made explicit for Leaflet markers. The two locale polish findings (numeric EUR formatting and saving only explicit language choices) were treated as requirements and fixed with regression checks. No deferred review findings remain.
- Added nearest-city labels as an approximate disambiguation aid, preserving source region/postcode first and coordinates as last fallback. This is documented as approximate context rather than an administrative boundary assertion.
- Final checks: 10 TypeScript unit/operations tests pass; 9 PostGIS/HTTP integration checks pass; 7 Playwright browser tests pass; 4 Python extractor tests pass. TypeScript/Vite production build and strict OpenSpec validation pass.
- Full local Compose images build. Missing initial dataset, successful regional download/checksum/filter/extraction/publication, restart persistence, rejected suspicious publication, and a deliberate HTTP 404 during download were verified. The 404 job is reported failed while all 246 previous facilities remain available. A subsequent successful local sample import clears that test failure.
- Backups and transactional restores were rehearsed locally. The operations wrapper preserves the active Compose file set; a shell-boundary regression test proves the production override survives recreation without changing any host configuration.
- Public OSM tiles loaded successfully in the real local browser preview; blocked-tile behavior is separately covered by browser tests. Desktop/mobile screenshots are in screenshots/. No page JavaScript errors were observed. Source Germany polygon checks cover Munich, Sylt and Borkum while rejecting Paris.
- Database-only development Compose validated and started locally on port 55432, seeded with the existing Bremen sample. Native Node API readiness and a free-filtered search through the Vite proxy succeed. The API inspector is bound to localhost:9229, and Vite is at localhost:5173. The optional Munich sample was documented only at the owner's instruction and was not downloaded.
- Translation JSON files remain separate in src/web/locales. The owner's preferred München/81243 example appears in all three languages. Project-installed frontend-design and web-design-guidelines informed visual direction and accessibility/motion checks.
- OpenSpec progress is 27/28 tasks verified. Remaining task 6.7 is the pre-deployment host/resource/backup check. Contabo was not modified or redeployed, certificates were not issued, and existing renewal timers were not changed. Full-Germany import resource usage has not been measured; sample-based initial limits are explicitly provisional.
- Final cleanup stops the temporary full-stack Compose services and disposable integration-test database after verification. The separate dev database, native API (debug inspector localhost:9229), and Vite frontend (localhost:5173) remain available. Data volumes and backups are retained.
