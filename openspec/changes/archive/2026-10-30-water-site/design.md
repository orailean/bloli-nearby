## Context

The owner selected Water and created `water.bloli.com`. DNS A resolves to `173.212.194.159`, no AAAA answer was observed, and existing web/API/DB containers are healthy at `30920c1`. The three current categories are registry-driven with atomic snapshot publication and shared source identity checks. The fourth category must participate in those contracts, not run a separate data pipeline.

Existing preferences persist: free dependencies/data, distinct playful design, header/footer, separate DE/EN/RO, German fallback, Munich 81243 search example, 0.5 km default and 0.5/1/2/3/5 km choices, accessible responsive layout, Docker-only local DB, no binaries in Git, shared Docker Nginx and documented VM operations. Multi-country expansion remains on hold; this site initially covers Germany.

## Goals / Non-Goals

**Goals:** Help people locate explicitly mapped potable-water and refill opportunities; preserve mapped access/fee/hours/seasonality; launch a distinctive fourth site on the existing stack with HTTPS and automatic certificate renewal.

**Non-Goals:** Certifying water quality or live operation, assuming every fountain/spring/tap is potable, treating ordinary shops/cafés as refill partners, inferring missing opening hours as 24/7, adding countries, new permanent containers, tile hosting, paid APIs or new host port bindings.

## Decisions

### Approaches and shared architecture

The existing shared platform is the practical fit: add `water` to site/category/normalizer registries, additive category checks and importer completion metadata. A separate stack duplicates source storage, database and operations. A standalone external-data frontend would bypass current import validation and source provenance. Neither alternative serves the owner's shared-app preference.

Use `water.bloli.com` and `water.localhost:5173`; bind the category explicitly by host in the API, web gateway and initial HTML generation. Preserve unknown-host rejection and prevent category overrides. Reuse all existing generic service, image, network, volume and DB/login identities.

### Conservative inclusion and negative precedence

Include active fixed objects with at least one positive indication:

- `amenity=drinking_water`;
- `drinking_water=yes` on another mapped feature;
- `amenity=fountain` with `fountain=drinking`;
- `drinking_water:refill=yes` for an explicitly mapped refill establishment.

Explicit contradictory `drinking_water` values other than `yes` (including `no`, `conditional`, `seasonal` or unknown/unrecognized values) prevent inclusion, even when another tag is positive. Absence of this tag does not negate `amenity=drinking_water`, `fountain=drinking` or refill=yes. Exclude `drinking_water:legal=no`, inactive/disused/abandoned/demolished/removed/construction features, locked/key-only/restricted/conditional access, and route/collection relations. Allow public/yes/permissive access; allow customers access only for explicit refill establishments, and label it. Exclude an unqualified `water_point`, decorative fountain, tap or spring. Do not infer from names. Do not guess potability from `drinking_water:legal=yes` alone.

Keep Python candidate detection broad enough to retain all positives and geometry, with TypeScript normalization applying final restrictions. Extend the osmium prefilter for water/refill tags. Reprocess the retained verified PBF because the old filtered file omits water; reuse its checksum/snapshot and do not redownload it unnecessarily. Use existing fixed node/way/area/multipolygon/site/building geometry handling and failure policies.

References: OSM [drinking water](https://wiki.openstreetmap.org/wiki/Tag:amenity=drinking_water), [potability property](https://wiki.openstreetmap.org/wiki/Key:drinking_water), [refill partners](https://wiki.openstreetmap.org/wiki/Key:drinking_water:refill). These tags describe community observations, not a live quality guarantee.

### Water data and filters

Normalize stable identity, name/translations, coordinates, category, access, fee/charge, wheelchair, mapped hours, operator, description and source tags. Add a mapped water type (`refill` or `point`, refill positive takes precedence), and preserve bottle suitability (`bottle`), seasonality (`seasonal`), refill network and water-specific hours where mapped. Missing detail stays unknown. Do not present `bottle=no` as a bottle refill opportunity. Refill establishments remain subject to their mapped access/hours and do not become public standpipes.

Use the existing free/paid filter capability with unknown fees retained under All. Resolve fee from explicit mapped `drinking_water:fee` where present; otherwise from `fee` only on a standalone water feature, never an unrelated venue's entrance fee. Generic refill establishments without water-specific fee stay unknown. Conditional fee stays unknown. Filters do not initially include water type; show that distinction on each result/details without adding a new shared query parameter. Reject seller-type filters for Water.

Water-specific `opening_hours:drinking_water` takes precedence where present. Otherwise use mapped `opening_hours`, with no inferred 24/7 behavior. Free-text seasonal details are displayed but do not synthesize schedules. When `seasonal` indicates seasonal operation and a sufficiently explicit annual/month schedule is missing, Open now remains unconfirmed/excluded; use the existing conservative parser for explicit schedules. A plain daily time range must not confirm a seasonal fountain is running in winter. Label the checkbox as based on mapped hours, not live water flow.

Do not change legacy machine24/7 behavior or existing category counts for the same retained source. The importer must require all four categories after Water first activates, apply an independent `MIN_WATER_POINTS` floor/count-drop check and retain all active data on failure. Set the initial production floor from measured extract counts with a conservative bootstrap default100.

### Visual direction: the refill stop

The owner approved this design on 2026-10-27. Use a white/cobalt bottle-refill identity rather than simply recoloring Kebab.

- Palette: porcelain white `#FFFFFF`, deep water ink `#12335B`, cobalt `#1459D9`, pale pool `#E8F7FC`, turquoise `#087E8B` and a small citrus accent `#E4F46D` for the selected marker.
- Typography: existing locally bundled Rubik for rounded bold headlines/wordmark and DM Sans for readable controls/details; verify Romanian diacritics. No runtime font CDN.
- Memorable feature: original SVG tap filling a smiling reusable bottle, with a water-level shape and compact drop/bottle logo variant. Keep the illustration to the side on desktop, small and contained beneath/beside text on phones, never behind unreadable letters.
- Layout: clean left-aligned header/search hero, a thin waterline divider, compact fee/Open now/radius toolbar, numbered list and map, clear source details and footer. Preserve shared navigation and mobile page scrolling; avoid new decorative card grids.
- Motion: one short initial fill, and a brief ripple or bottle nod triggered by search/result selection/detail expansion. No constant dripping, blinking or motion behind text. Reduced-motion users receive static equivalents and all controls retain focus visibility.
- Copy proposals: English “Good days start with a refill.”, German “Kurz auffüllen. Weiter geht’s.”, Romanian “Umple sticla. Continuă drumul.” Plain operational messages distinguish drinking-water points from refill partners and mapped seasonal information from live availability.

Use Lucide icons and original code-native SVG artwork/favicon. Inspect real desktop and 320/390/430 px phone screenshots in all languages, including long result names. Fee controls and status remain readable without horizontal page overflow.

### Operations and rollout

Keep one combined refresh producing four categories. Native development remains one Vite/API plus Docker-only DB, with small synthetic Munich/Bremen water examples including seasonal, refill and negative cases. Extend all-site verification to four hosts and preserve source-only Git.

Use the existing Nginx shared proxy include and ACME webroot/account. Add HTTP challenge configuration, issue Water's certificate using `/snap/bin/certbot`, extend the existing deployment reload hook's domain allowlist, then activate the HTTPS vhost. Validate Nginx before graceful reload; do not recreate shared Nginx or modify unrelated sites. Dry-run renewal including the deploy hook for all four certificates.

## Risks / Trade-offs

- [Mapped water is seasonal, inaccessible or outdated] → Conservative inclusion/access/hours and visible mapped seasonality/source information; do not claim live water quality/flow.
- [Venue fee/hours incorrectly attributed to water] → Explicit water-specific precedence and unknown fee for generic refill partners without mapped water fee; tests for conflicting tags.
- [Fourth category silently omitted during later refresh] → Required-category completion metadata, per-category checks and real publication rollback tests.
- [New features expose geometry edge cases] → Existing validated extraction geometry and missing-required-geometry rejection, real source rehearsal before publication.
- [Shared UI or import regresses existing sites] → Same-source count comparison, four-host API/metadata/browser tests, verified pre-change backup.

## Migration Plan

1. Save current revisions/images/counts/source dates/mounts/timers and private resolved config. Take and verify a backup before schema/import changes.
2. Implement/test rerunnable additive Water support and a four-category sample. Keep existing three sites available while Water readiness is pending.
3. Reuse the verified retained Germany PBF, regenerate filtered extraction and run one validated four-category publication. Record counts and confirm old three category counts match for the same source; take a verified post-import backup.
4. Confirm Water DNS, configure ACME HTTP challenge, issue TLS, add renewal hook handling and validate/gracefully reload the final HTTPS vhost using the shared upstream.
5. Verify all four public sites, category isolation, real map tiles, German fallback, details/fees/radii, seasonal Open now, translations/mobile widths and certificate renewal. Preserve timer operation.
6. Save actual VM commands/results/paths/counts/certificate and update/rollback procedure in a dated project protocol. Commit/push source-only changes, synchronize the VM checkout, remove completed helpers and stop local debug services.

Rollback keeps additive schema and generic volumes; pause refresh before running incompatible older code, because the old three-category importer must not run against the active four-category state. Restore compatible images/config or the verified pre-change backup when necessary. Never delete the only source/data copy or remove old rollback volumes during this feature.

## Open Questions

- Owner approved the concrete visual/scope design on 2026-10-27. DNS is confirmed.
- Actual extracted Water count and initial production validation floor will be measured during implementation.
