# Kebab rollout protocol — 2026-10-27

## Approved scope and baseline

Owner approved `kebab.bloli.com`, mapped Döner/kebab venues and the white/aubergine/saffron takeaway design. Shared services/database and existing data resources remain. DNS was confirmed as A 173.212.194.159 with no AAAA answer before TLS work. Implementation uses isolated branch `feat/kebab-site`, base f03361b; existing production commit d76524f before rollout.

- Canonical VM checkout: `/home/oliver/stack/bloli-nearby`; running containers `bloli-nearby-{web,api,db}`, all healthy at baseline.
- Existing active counts from prior successful import: 25,954 toilets, 107,861 tobacco sellers, 196,951 settlements. Source pinned for comparison/reuse: Germany 2026-10-25, timestamp 2026-10-25T21:21:21Z.
- Verified pre-change dump using `docker compose exec -T db pg_restore --list` without restoring it.
- Snap Certbot is the existing modern client (`/snap/bin/certbot`); `/usr/bin/certbot` is legacy 1.12.0 and is not used for this rollout. Existing renewal scheduling is retained.
- Pre-change backup: `backups/bloli-nearby-20261027T075625Z.dump` (verification recorded below before migration).
- Existing external volumes and Compose migration identity preserved. Retained source mount `/var/lib/docker/volumes/find-a-loo_import_data/_data`.
- Only one refresh/backup timer pair active; next refresh Sunday 2026-11-01 03:40:34 CET. Schedules unchanged.
- Existing Docker Nginx mounts `nginx_nginx_conf` at `/etc/nginx/conf.d`, `/etc/letsencrypt`, and shared ACME webroot `/var/lib/dehydrated/acme-challenges`. Existing Certbot account reused; private account data is never copied into this protocol.

## Implementation and local verification

- Added explicit third host/category, mapped food classifier/details, registry-driven atomic category staging, active-category completeness, additive category constraints and food import job counts.
- Added cuisine extraction, strict food geometry checks and three-category metadata, while preserving source/cache validation and existing geometry handling.
- Added original SVG artwork/favicon, locally bundled Rubik, separate DE/EN/RO content, safe mapped links/details and action-triggered/reduced-motion styling. Production shells carry per-domain identity before JavaScript.
- Baseline 29 tests passed. Initial integrated checks: 37 unit checks, 25 Python importer checks, production build and 12 real-PostGIS checks passed. Mocked three-host browser suite: 12 checks over desktop and 320/390/430 px, each covering all three languages, passed. Desktop German and phone Romanian screenshots visually reviewed; no horizontal overflow.
- Local PostGIS was started temporarily for isolated `bloli_nearby_integration`; saved development data is not truncated. Temporary frontend test services stopped automatically. Final local cleanup will be recorded after verification.

## Production operations and final evidence

Pending implementation review and production rollout. Actual commands/results, certificate checks, source/count comparison, final backups and commits will be appended here.

### Review, sample and certificate preparation

- Fresh whole-change review found no new functional blocker. Removed a machine-specific Python environment symlink from the staged deliverable and expanded its ignore rule. Added cross-category same-source coordinate validation before coverage filtering/publication; regression demonstrated failure before the fix and passed afterward. Missing completion markers were verified through importFile with unchanged active metadata afterward.
- Final local sample seeded into fresh disposable `bloli_kebab_sample_20261027`: 6 toilets, 8 sellers, 8 kebab places, 2 settlements. Existing saved development database was not reseeded. Full browser suite passed 26 checks; unit 37, Python 25, PostGIS 12 and build passed. All three site phone/locale flows covered; production proxy/WebKit evidence follows during rollout.
- Saved existing Docker Nginx configuration privately to `backups/nginx-before-kebab.conf`. Installed only the new HTTP bootstrap vhost and validated/gracefully reloaded Nginx. Existing deprecation warnings from unrelated vhosts were unchanged. Verified the ACME probe publicly after reload and ensured the probe file is readable.
- Issued new Kebab TLS with `/snap/bin/certbot certonly --webroot`, existing account and webroot. Success log `logs/kebab-cert-issuance.log`; certificate expires 2027-01-25 and lives under `/etc/letsencrypt/live/kebab.bloli.com/`. HTTPS app activation remains gated on data readiness. Existing site certificates and renewal schedules were retained.
