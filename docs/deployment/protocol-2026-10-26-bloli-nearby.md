# Bloli Nearby migration protocol — 2026-10-26

## Authorization and baseline

The owner approved the Bloli Nearby platform/repository name, the two-domain shared design, tobacco sellers beyond machines, and implementation/deployment of OpenSpec change `bloli-nearby-multi-site`. Existing no-binaries-in-Git, separate DE/EN/RO dictionaries, native local debugging and VM protocol requirements remain in force.

- Original application commit: `d5aa33b2f67c4ffb7d37c020073607fc645b7509`.
- VM: `vmd34296`, `oliver@173.212.194.159`; original checkout `/home/oliver/stack/find-a-loo`, target `/home/oliver/stack/bloli-nearby`.
- Existing Compose project: `find-a-loo`; containers API/web/DB healthy; only container-internal 3100/80/5432 ports.
- Existing persistent volumes verified: `find-a-loo_postgres_data` and `find-a-loo_import_data`, under `/var/lib/docker/volumes/<name>/_data`.
- Current WC snapshot: 25,954 facilities and 196,951 settlement/postcode records, source `germany-261025.osm.pbf`, dated `2026-10-25T21:21:21Z`. Retained PBF checksum recorded as `1a2bd3665c3e2507e1da99befd2ac228`.
- Kippe DNS A resolves to `173.212.194.159`; no AAAA answer at preflight.
- Shared Docker Nginx remains running; current config backup saved as `backups/nginx-before-bloli-nearby-20261026/`.
- Pre-migration DB backup created: `backups/loo-20261026T210316Z.dump`.

## Implementation and verification

- Added generic OSM identities/category memberships and per-category metadata through additive schema changes; legacy WC tables remain transactionally maintained for rollback.
- Implemented explicit host profiles, generic category-scoped discovery, seller-type filters and conservative evidence-based retailer normalization. Customer-only access is preserved. Once tobacco data is active, partial WC-only refreshes are rejected to avoid mixed shared geometry/settlement snapshots.
- Extended Python filtering/extraction for machines, tobacco shops and explicitly tagged tobacco-selling shops/petrol stations, retaining multi-category identities and strict fixed-location geometry checks.
- Created shared frontend modules, separate common/site JSON dictionaries and distinct Loo/Kippe artwork/themes, HTML metadata and favicons. Preserved 0.5-km default, five radius choices, Open now, map/list interactions and natural phone scrolling.
- One read-only source scan launched as `bloli-tobacco-distribution`, with outputs in `logs/tobacco-distribution.{py,json,err}`; no duplicate Germany download.
- Unit checks passed (24); isolated PostGIS integration checks passed (11), including category/host isolation, repeat imports, failed snapshots and partial-refresh rejection. Python checks passed (14). Integrated browser checks passed (22), plus agent-run Chromium/WebKit checks for both sites and all locales. TypeScript/production build and generated site shells passed.
- Built an isolated local Compose stack `bloli-nearby-smoke` on loopback port 18088. Verified both host-specific initial HTML identities/canonical URLs, Kippe API profile and HTTP 421 for unknown host. Original development database remains separate.
- Seeded disposable native sample DB `bloli_sample_check`: 6 toilets, 8 sellers and 2 settlements. Dumped/restored into `bloli_restore_check`; both category counts survived. No synthetic sample records are imported into production.
- Added explicit production external-volume bindings and preserved Compose identity; added generic gateway alias while retaining legacy alias. New backup/refresh units use the target canonical path. Added Kippe bootstrap/HTTPS config and a renewal deploy hook scoped to both domains.

## Repository rename

- GitHub CLI had no authenticated identity; Chrome was signed into the work account. At the owner's direction used Firefox, already authenticated to personal `orailean`, to rename the repository to `orailean/bloli-nearby`.
- Updated repository About description to “Bloli Nearby: shared OpenStreetMap discovery for Find a Loo and Kippe — public toilets, cigarette machines and mapped tobacco sellers across Germany.” Verified the saved description in the browser.
- Local remote changed to `git@github.com:orailean/bloli-nearby.git` and SSH access verified. README/package metadata and current operator guides now use the umbrella name. Historical protocols retain original names.

## Remaining rollout steps

Rename VM checkout/remotes and timer paths, pin/reuse source for combined import, install Kippe TLS/renewal, deploy shared build/API, verify public sites and counts, record final backup/status, and rename the local checkout after active work completes. Append actual results below; this section does not claim those steps are complete.
