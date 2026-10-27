## 1. Scope, design and evidence

- [x] 1.1 Confirm `transit.bloli.com`, DNS and focused rail/bus/taxi/ferry/cable scope; investigate existing shared contracts and OSM legacy/PTv2 structures.
- [x] 1.2 Write the concrete design, obtain a fresh builder check and settle entrance eligibility/distance semantics.
- [x] 1.3 Obtain owner approval of the written visual/data design, then write the implementation plan.
- [x] 1.4 Verify source-backed S-Bahn mode evidence using München, Berlin and Hamburg records, document rules/allowlist and measure a bounded route-context approach before full-source processing.

## 2. Extraction, classification and publication

- [x] 2.1 Add failing tests for legacy/PTv2 station/platform tags, all modes, explicit negatives, inactive/freight/private sources and unresolved mode fallback.
- [x] 2.2 Implement Transit profile/mode types and conservative source/evidence normalization with multiple modes, mapped details and no invented availability.
- [x] 2.3 Extract/cache source-bound route and stop_area member context separately from route geometry; retain usable entrances and candidate geometry without national route path recursion.
- [x] 2.4 Add required-geometry/completion regressions and explicit diagnostics/fallback for missing optional enrichment or ambiguous parents.
- [x] 2.5 Add rerunnable Transit category/count and raw component/group-membership schema changes, with independent minimum/drop validation.
- [x] 2.6 Publish five categories, settlements and transport context atomically; test incomplete-context/category rejection and retention of all active data.

## 3. Grouped discovery and API

- [x] 3.1 Implement explicit stop_area grouping with stable logical keys and preserved raw source identities; never merge by name/proximity or collapse stop_area_group networks.
- [x] 3.2 Apply selected-mode/access/member-radius eligibility before group distance/order/limit, using the nearest usable entrance/platform and approximate station fallback only when no such mapped component exists.
- [x] 3.3 Expose chosen component/distance provenance, multi-mode context and mapped platform references; suppress walking links for stop_position-only references.
- [x] 3.4 Add validated Transit-only mode filtering and capability-aware rejection/omission of Transit fee/seller/Open-now parameters; preserve four-site existing queries.
- [x] 3.5 Verify actual PostGIS queries for duplicate/opposite-direction/ambiguous groups, entrances/platforms across radius boundaries, mode-specific destinations, truncation after grouping and source identity conflicts.

## 4. Transit presentation

- [x] 4.1 Add separate DE/EN/RO Transit labels/details/errors, German fallback and clear static source/access-hours wording.
- [x] 4.2 Build the original wayfinding train/bus/route artwork, compact logo/favicon, silver/teal/orange theme and reduced-motion-aware search/selection transitions.
- [x] 4.3 Add accessible mode controls, multi-mode badges and group/platform details; preserve common radius/map/list/directions behavior and hide unavailable filters.
- [x] 4.4 Add production/native host bindings, generated Transit initial shell/canonical/social metadata and strict gateway routing.
- [x] 4.5 Verify desktop and320/390/430px all-language screenshots and keyboard flows with long names, multi-mode interchanges, approximate references and natural mobile scrolling.

## 5. Local workflow and readiness

- [x] 5.1 Extend guarded small samples to five categories, including source-backed mode examples, grouped platforms/entrances, ungrouped stops and an approximate-only reference.
- [x] 5.2 Update native Vite/API plus Docker-only DB debugging, source-storage, classification and production update/rollback docs without committing datasets/binaries/secrets.
- [x] 5.3 Add Transit HTTP/HTTPS Nginx templates using the shared proxy and document fifth-domain renewal hook handling.
- [x] 5.4 Extend all-site production checks and run meaningful unit/importer/PostGIS/browser/build/image-readability verification; obtain a fresh whole-change review and fix important findings with regressions.

## 6. Controlled rollout and audit

- [x] 6.1 Save current VM versions/images/counts/source/mounts/timers/private config and verify a pre-change backup; preserve working four sites and existing generic resources.
- [x] 6.2 Deploy compatible images, pause refresh, reuse verified Germany source and build transport context/filter; measure runtime/resource use and publish five validated categories.
- [x] 6.3 Compare original four counts for the same source, set measured Transit floors and verify source/group/readiness details plus a post-import backup.
- [x] 6.4 Issue Transit TLS using existing ACME infrastructure, extend renewal hook scope, validate/gracefully reload Nginx and dry-run all five renewals.
- [x] 6.5 Verify representative modes/interchanges/S-Bahn evidence and all five public sites with actual map tiles, languages, phone layouts and no page errors; resume/verify timers.
- [x] 6.6 Save the dated actual VM protocol and current operating instructions, commit/push source-only changes, synchronize the VM and stop/remove temporary debugging/helpers while preserving active data/backups and documenting the owner-authorized unused legacy-volume removal.
