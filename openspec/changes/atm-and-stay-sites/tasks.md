## 1. Foundations and category contracts

- [x] 1.1 Confirm the broad Stay scope/directions and approve design; record implementation plan using the writing-plans skill.
- [x] 1.2 Verify ATM field namespaces and embedded-machine semantics against primary OSM docs and representative real records.
- [x] 1.3 Add ATM/Stay site profiles, category/types/filter contracts, walking/driving defaults and host isolation.
- [x] 1.4 Implement conservative ATM normalization with explicit eligibility, access, fees, currencies, deposits and mapped-hours handling.
- [x] 1.5 Implement Stay type/detail normalization with safe contact links and separate reception/check-in information.

## 2. Eight-category extraction and publication

- [x] 2.1 Extend filters, kind extraction and geometry preflight for standalone/embedded ATMs and the eight accepted accommodation types; invalidate old filter caches.
- [x] 2.2 Extend additive schema/category registries, import records/counts, per-country floors, completion checks and activation/readiness for eight categories.
- [x] 2.3 Add non-publishing normalized-count measurement with guaranteed staging rollback for national floor calibration.
- [x] 2.4 Preserve active six-site readiness during migration and reject old/incomplete importers against expanded snapshots.
- [x] 2.5 Add classifier/extractor and PostGIS publication/isolation regressions, including border identity, missing categories, geometry failures and failed-import retention.

## 3. Discovery and focused interfaces

- [x] 3.1 Implement ATM currency/deposit/mapped-fee and Open now filters before result ordering/limit; validate parameters per host.
- [x] 3.2 Implement Stay type filtering and reject inappropriate fee/Open now parameters; preserve fast indexed place search and spatial candidates.
- [x] 3.3 Apply frontend-design skill to build ATM cash-slip identity, subject artwork, header/footer, details and reduced-motion-aware transitions.
- [x] 3.4 Build Stay travel-journal identity, type navigation, subject artwork, header/footer, contact actions and availability wording.
- [x] 3.5 Add separate DE/EN/RO/HU site dictionaries, German fallback and active-country coverage/meta text across eight hosts.
- [x] 3.6 Extend native local host routing and small guarded synthetic samples for both categories across all four countries.

- [x] 3.7 Add Hungarian common/site dictionaries across all eight sites, browser detection, selector, names, formatting and complete-language regressions.

## 4. Routing and verification

- [x] 4.1 Extend generated shells, Docker gateway, Nginx vhost templates and renewal deploy hook coverage to both domains using the shared upstream.
- [x] 4.2 Verify normalizers, imports, filters, missing/unknown fields, embedded ATM assumptions, Stay reception semantics and directions with relevant unit/integration checks.
- [x] 4.3 Verify all eight site identities on desktop and 320/390/430 px in all languages, map/list/radius/selection, keyboard behavior, external actions and overflow.
- [ ] 4.4 Extend live production probes to both new sites/countries and compare place/nearby timing with existing six-site baselines.
- [x] 4.5 Document eight-category refresh, country floors, source reuse, local debugging, production updates, backup and incompatible-importer rollback.

## 5. Controlled production rollout

- [x] 5.1 Record VM resources, six-site counts/IDs/timings, verified source pins, private configuration and timer state; take/verify backup and pause refresh.
- [x] 5.2 Merge approved implementation into main, push and deploy compatible additive API/importer/web from main; verify existing sites remain healthy.
- [ ] 5.3 Measure DE candidates from retained verified source without publication, configure new national floors and publish/verify its eight-category snapshot.
- [ ] 5.4 Measure/publish/verify RO, then AT, then HU sequentially with separate floors, retained Transit context and independent failure/rollback evidence.
- [ ] 5.5 Verify new national readiness and existing six-category identities/counts, border behavior and searches in Munich/Bucharest/Vienna/Budapest; take/verify cutover backup.
- [ ] 5.6 Configure Docker Nginx vhosts/TLS for both domains, validate/reload and verify certificate renewal with deploy hooks.
- [ ] 5.7 Run final eight-site live API/browser/performance checks, back up, resume/check existing refresh scheduling and stop temporary local services.
- [ ] 5.8 Save dated VM protocol with exact commands/paths/sources/counts/sizes/backups/results; commit/push source-only work, sync production main and clean fully merged feature branches.
