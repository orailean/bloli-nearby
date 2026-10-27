## Context

The owner confirmed `kebab.bloli.com` and mapped Döner/kebab places. Loo and Kippe already share one web/API/PostGIS stack, an OSM source volume and a weekly combined refresh. The current category types, database checks, staging and host maps explicitly support two categories. Extend those contracts deliberately; another hostname alone cannot provide a third dataset.

Existing requirements persist: Germany coverage; free dependencies/data; separate DE/EN/RO files; unsupported browser languages default to German; 0.5 km default with 0.5/1/2/3/5 km options; responsive map/list synchronization; Open now; source-only Git; VM protocol; owner-managed Docker Nginx. Local debug services are currently stopped and must be stopped again after any necessary tests.

## Goals / Non-Goals

**Goals:** A distinct Kebab experience on the confirmed domain, correct food classification, one coherent three-category publication, shared native local development and safe production rollout without changing existing data-resource identities.

**Non-Goals:** Reviews, ordering, live menus/stock/prices, inferred halal status, paid APIs, new permanent app containers, another database, changing refresh frequency, or including every Turkish restaurant regardless of cuisine.

## Decisions

### Approach: extend the shared platform

The owner's existing shared-platform preference remains applicable. Add one site module/profile and category, not a separate deployment. A standalone stack would duplicate data, imports and operations; putting kebab places into the tobacco category would weaken isolation and validation. Keep the current database/login, Docker volume bindings, project identity, image names, network and schedules.

Use a registry of supported category record kinds/normalizers and common category staging/publication rather than adding another independent copy of the toilet/seller pipeline. Keep legacy toilet tables transactionally synchronized for existing compatibility/rollback. This is an implementation choice, subject to integration tests rather than a new public API surface.

### Classification and mapped details

Include active, accessible fixed venues tagged `amenity=fast_food` or `amenity=restaurant` whose semicolon-tokenized, case-normalized cuisine includes `kebab`, `doner`, `doener` or `döner`. The standard kebab tag intentionally covers Döner and other kebab places, as the owner selected. Do not infer inclusion from Turkish cuisine or a business name alone. Exclude explicitly closed/private/inactive features and route/collection relations using the existing conservative rules.

Preserve source identity, names, geometry, cuisine and mapped opening/access/payment data. Display takeaway/delivery and dietary information only when mapped; never infer halal/vegan status. Show safe HTTP(S) menu/website links when present. Keep missing values unknown and do not apply the vending-machine 24/7 default to food venues. Existing German-time opening-hours logic applies.

Extend the osmium filter and Python extraction to the new candidates, with node/way/multipolygon/site/building relation coverage. Reuse the validated geometry handling added during Kippe expansion. Incomplete fixed geometry must prevent publication, not silently remove valid places. Reuse a verified retained PBF for initial deployment; do not download Germany again unnecessarily.

### Coherent category publication and additive migration

Add `kebab` to the explicit database category checks through a rerunnable additive migration. Validate declared categories against the registry and require every already-active category in a replacement snapshot. The initial transition from two to three categories is allowed; after Kebab activation, two-category/partial imports must be rejected.

Stage each category plus shared settlements before one transaction publishes shared identities, memberships and category metadata. Support the same source object in multiple categories. Per-category minimums and previous-count/drop checks apply independently; choose the initial Kebab minimum from measured extract counts, with a conservative first-import floor and the existing ratio policy afterward. Unknown kinds/categories and missing completion markers remain errors. Failure retains all active categories and records a failed job.

### Approved visual direction: the takeaway counter

The owner approved this design on 2026-10-27 with “yes, build”.

- Palette: porcelain white `#FFFFFF`, aubergine ink `#402B52`, saffron `#F6BA32`, parsley `#21755C`, and a restrained ceramic blue `#1598A5`. White is the main surface; aubergine/saffron carry the identity, with the other colors reserved for food artwork and status.
- Typography: locally bundled free Rubik for a bold, friendly wordmark/headlines, with the existing DM Sans for readable controls and details. Verify DE/RO diacritics and font licensing; no third-party font requests at runtime.
- Memorable element: an original SVG Döner spit/wrapped-pita illustration integrated into the search hero, with a compact logo variant. Headline proposal: “Mit allem. Ganz in deiner Nähe.” Keep the search/location action dominant.
- Layout: familiar header, search hero, radius/Open now controls, numbered results and map, details, and footer. Treat list rows like concise counter tickets without enclosing every block in a decorative card. Align search and results left; mobile uses normal page scrolling and a contained map, with no horizontal overflow.
- Motion: one brief, action-triggered spit turn or paper-ticket reveal during search/selection, with restrained detail/navigation transitions. No perpetual spinning or independent bouncing decorations. Respect reduced motion and keyboard focus.
- Reuse Lucide icons and shared behavior while placing Kebab content/artwork/theme in `src/web/sites/kebab`; keep translations separate. No tobacco/toilet labels or branding flash on the new domain.

The subject-specific illustration and counter-ticket treatment carry the personality. Avoid a generic dashboard/card layout or simply recoloring Kippe. Inspect real screenshots on desktop and 320/390/430 px phones in every language before release.

### Routing, local workflow and metadata

Bind `kebab.bloli.com` explicitly to its category in API and both proxy layers; retain production unknown-host/override rejection. Add `kebab.localhost:5173` with the same native API/Vite and Docker-only local database. Domain-specific initial HTML, canonical URL, favicon and social metadata must exist before JavaScript runs. Update shell generation to use profile domain metadata rather than assuming every future domain from its ID.

Keep Kebab filters limited to radius and Open now for the first release. Reject fee and tobacco seller-type filters on its API. Existing Loo/Kippe endpoints, capabilities and styles continue to behave as before. Include a small clearly synthetic Munich/Bremen three-category seed; no full data or binaries enter Git.

## Risks / Trade-offs

- [OSM cuisine tags are incomplete and kebab is broader than Döner] → Use the owner-approved mapped scope and community-source wording; do not promise complete coverage or current menus.
- [Additional food relations expose geometry forms not yet handled] → Test real candidate geometry early, retain strict validation and old active data on failure; save diagnostics.
- [Importer generalization regresses existing categories] → Real isolated PostGIS tests for all three hosts, multi-category identities, thresholds, partial imports and rollback retention; compare live WC/tobacco counts for the same source snapshot.
- [Long import and resource pressure] → Reuse source/filter where valid, preserve bounded processing and existing resource limits; monitor before activation.
- [Visual density or translated copy breaks phones] → Dedicated all-language screenshots and overflow/list/map/selection tests, including longer real names.
- [DNS is not configured yet] → Prepare source/configuration independently; certificate issuance/public activation waits for confirmed A/AAAA routing.

## Migration Plan

1. Record current commits/images, counts, source identity, timers and Nginx configuration; take and verify a backup.
2. Build/test the additive three-category changes and importer. Deploy compatible schema/API/web with existing Loo/Kippe working; keep public Kebab activation pending readiness.
3. Run one combined import using the verified retained Germany snapshot. Preserve logs, verify all three counts/readiness and existing-category retention, and take a post-import backup.
4. After DNS points to the VM, use the existing Docker Nginx challenge webroot/account for Kebab TLS. Add the domain to the shared renewal hook; validate/gracefully reload Nginx. No shared Nginx recreation or new host ports.
5. Activate the Kebab HTTPS vhost using `bloli-nearby-proxy.inc`. Verify public metadata, category isolation, search/filter/details, tiles, translations, phone widths and certificate renewal for all three domains.
6. Document actual VM commands/results, data locations and update/rollback instructions in a dated project protocol; commit/push source-only changes, sync the checkout, remove completed helper containers and stop local test/debug services.

Rollback preserves the additive schema and existing volumes, restores previous app images/configuration and deactivates only the new vhost if needed. Once all three categories are active, avoid running an older two-category importer; pause only the shared refresh timer during controlled rollback and document resumption. Use the verified pre-change backup for a full data/schema rollback only when necessary.

## Open Questions

- Visual direction approved by owner on 2026-10-27.
- Owner creates the `kebab.bloli.com` DNS record pointing to `173.212.194.159`, with no conflicting AAAA record, before TLS activation.
- Initial Kebab validation floor to be set from the actual retained-source extract during implementation.
