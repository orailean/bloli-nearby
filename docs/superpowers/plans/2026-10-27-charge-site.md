# Charge implementation plan

**Goal:** Deliver charge.bloli.com as a verified sixth shared Germany site.
**Architecture:** Station-level OSM normalization into shared categorized locations; connector-local JSON predicates on spatial candidates; existing shared UI with Charge module and host-specific driving directions. Reuse source/Transit context, publish all six atomically, analyze after publication and activate HTTPS after validation.
**Spec:** openspec/changes/charge-site/design.md and specs/*/spec.md.
**Execution:** Native inline implementation; the owner approved the design/task list by requesting apply. One fresh whole-change review before release.

## Global constraints

Germany only; country expansion on hold. Public/customer/destination car charging, no private/bicycle-only/dispensers. No live availability claims. DE/EN/RO separate JSON, German fallback. 0.5/1/2/3/5 km, default0.5. Existing generic containers/DB/volumes/Docker Nginx, no new ports. No binaries/data/secrets in Git. Existing five-site behavior and counts preserved.

## Review focus

- Contradictory vehicle/access/lifecycle evidence must exclude even with a positive socket.
- Type2 22kW plus CCS150kW cannot match Type2 minimum150kW; all predicates precede result cap.
- Unknown/zero/conditional socket and power values cannot invent compatibility or speed.
- Seasonal/conditional hours and parking fees cannot become open/free charging claims.
- Publication commit and statistics/activation errors must remain distinguishable; retry activation without repeating import.

## Tasks

- [ ] 1. Inspect retained source tags/representative stations; freeze connector keys. Add tests/charge.test.ts RED for normalizeCharge(SourceRecord):Facility|null, parseChargePower(string):number|null, Charge connector types, vehicle/access negatives and unit/count/unknown cases. Implement src/shared/charge.ts, charge-types.ts, Facility.charging and Charge profile. Verify full unit suite GREEN.
- [ ] 2. Test Charge parseSearch and directionsUrl(lat,lon,mode='walking') RED. Add connector/minPowerKw/chargeAccess defaults and strict host isolation, fee support, site-specific driving mode. Extend repository SQL with connector-local predicates before cursor/limit; exercise real PostGIS cap/radius/access/power cases and shared hours. Verify unit/integration GREEN.
- [ ] 3. Add importer regressions RED for charging nodes/ways/relations, missing geometry and six-category completion. Extend extract/prepare and add bounded geometry-only mode using the same geometry/classification code. Extend category registry/schema/counts/env/CLI/six-category sample and post-commit analyze with separately reported maintenance errors. Verify Python and six-category publication/rollback integration GREEN.
- [ ] 4. Add Charge module, original artwork and DE/EN/RO locale files; extend presentation/filter props and SharedApp state/request wiring. Build cobalt/coral responsive style and action/reduced-motion animations, mapped-only labels and Charge driving links. Add shells/gateway/native hosts/favicon. Verify build/browser six-host regressions, images/keyboard/mobile all locales.
- [ ] 5. Extend docs, Nginx templates, local samples and all-site production checker. Obtain one fresh whole-change review; regress material findings RED→GREEN, then run full relevant unit/Python/PostGIS/Chromium/WebKit/build/readability checks. Commit/push verified implementation.
- [ ] 6. Record VM preflight/backups, deploy compatible images, pause refresh, reuse source/context and geometry-preflight six categories, publish and compare five old counts. Analyze, verify post-backup/search, issue Charge TLS/extend six renewal dry runs, activate/reload and verify all six live. Resume timers, record actual protocol/update repo description, commit/push/sync docs, remove completed helpers/local debug and merge feature branch.
