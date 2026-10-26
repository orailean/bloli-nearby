# Germany Toilet Finder Implementation Plan

> Execute the approved OpenSpec change inline using test-driven development. The user's explicit apply instruction authorizes local implementation, not changes on Contabo.

**Goal:** A distinctive, accessible three-language toilet finder for Germany.
**Architecture:** React/Leaflet frontend, Node/PostGIS search API, streaming pyosmium import, Compose gateway integrated later with existing Docker Nginx.
**Spec:** openspec/changes/germany-public-toilet-finder/design.md and specs/*/spec.md.

## Global constraints

- German, English and Romanian; saved locale, supported browser language, then English.
- Public OSM tiles only for interactive viewport requests; local toilet/settlement data.
- Free means confirmed fee=no, Paid means confirmed fee=yes. Ambiguous fees remain unknown.
- Default 2 km radius, maximum 50 km, bounded results and explicit straight-line distance.
- No host modifications; all deployment work is prepared locally.
- User additions: Lucide icons, distinctive design, playful short transitions, branded header/footer, reduced-motion support.

## Review focus

1. Incomplete OSM relations and node-location failures must not silently publish an incomplete replacement.
2. An interrupted or suspicious refresh must retain the previous active dataset.
3. Stale asynchronous searches must not replace newer location/filter results.
4. Missing data must not appear as a real empty result set.
5. Locale changes and storage failures must not reset the user's search.

## Deliverables and execution

- [x] Domain contract: src/shared/types.ts, src/shared/domain.ts; tests/domain.test.ts. Normalize literal fee/access fixtures and validate query bounds first (RED), implement, run npm test (GREEN).
- [x] Database and import: src/server/schema.sql, db.ts, import.ts; importer/extract.py and run.sh. Tests exercise source deduplication, area coordinates, locks, failure rollback and dataset health against local PostGIS.
- [x] Search API: src/server/api.ts and main.ts. Test HTTP routes against a seeded local database: coverage, filters, distance ordering, postcode lookup, limits, errors and missing bootstrap.
- [x] UI: src/web/{App,Map,Icon}.tsx, styles.css and i18n.ts. Browser tests exercise live app, blocked tiles, search state, translations, keyboard and mobile layout before claiming completion.
- [x] Operations: Dockerfiles, compose.yaml, production override, gateway config, update/backup/restore scripts, README. Run local Compose build, bootstrap, restart, failed-import and restore rehearsal. Never execute host rollout commands.
- [x] Review and record: fresh whole-implementation review, fix material findings, rerun tests/build/Compose/OpenSpec checks, update OpenSpec task checkboxes only with evidence.

No commits/worktree can be made because this folder has no Git repository. Keep the execution record in docs/verification/implementation.md instead.

Language dictionaries were separated into src/web/locales/{en,de,ro}.json at the owner's request. The search example is München / 81243. Design skills installed project-only under .agents/skills. Any full-country resource/capacity claim stays pending until measured; local representative extraction is not a substitute for that check.
