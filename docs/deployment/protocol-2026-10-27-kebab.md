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

### Compatible deployment and import in progress

- Reviewed source commit `707ac59` merged fast-forward to main, pushed and synced to the VM. Built shared API/web/importer with generic image names; `docker compose up -d --wait api web` completed with all three services healthy. Existing Loo/Kippe public browser/API checks passed after deployment (`verification-existing-sites-after-kebab-deploy.json`).
- Started `bloli-nearby-germany-kebab-import` with dated retained source `https://download.geofabrik.de/europe/germany-261025.osm.pbf`. Checksum reuse confirmed; the cuisine-expanded filter is rebuilt. Existing active datasets remain available until atomic publication.
- Additional verification: 12 WebKit three-host phone/desktop tests passed. A temporary Docker gateway at loopback port 18088 served the correct initial shell/canonical for all three hosts and returned 421 for an unknown host; container stopped/removed afterward.
- Installed updated shared app certificate deploy hook with mode 755. Modern Snap Certbot renewal dry runs with deploy hooks succeeded separately for Loo, Kippe and Kebab. Logs: `logs/kebab-rollout-renewal-DOMAIN.log`. Existing Snap renewal timer remains active; next activation observed 2026-10-27 19:34 CET. No unrelated renewal jobs were changed.
- Stopped temporary local PostGIS and verified no local API/Vite/inspector/database debug ports listening after testing. Local sample data retained. Main workspace dependencies synchronized with the pinned Rubik dependency; no generated font files are tracked.

### Published data and owner-requested resource rename

- Three-category import completed with exit 0: 25,954 toilets, 107,861 tobacco sellers, 11,267 kebab venues and 196,951 settlements. Existing category counts unchanged; all category metadata shares the same source/date/import time. Saved `logs/kebab-germany-import.log` and removed the completed importer.
- Owner requested removal of legacy active volume references. Reviewed the ordered copy/migration plan in `volume-name-migration.md`; source/config changes target project `bloli-nearby` and explicit `bloli-nearby_postgres_data` / `bloli-nearby_import_data` volumes. DB credentials, service/image names, ports and Nginx remain unchanged.
- Rehearsed a physical copy of the stopped local development DB into a disposable volume: regular-file SHA256 manifests, ownership/modes and symlink metadata matched; PostgreSQL started from the copy and the synthetic sample retained 8 kebab / 8 tobacco / 6 toilet records. Stopped/removed the rehearsal container and deleted only its disposable clone; original local development data remained stopped and untouched.
- Paused the existing refresh timer after import exit and confirmed its service inactive. Saved the original resolved Compose manifest to private `backups/compose-before-volume-migration.yaml` and `.env` to `backups/env-before-volume-migration`, before pulling target config. Saved logical metadata/counts in `logs/volume-migration-before.json`.
- Post-import/pre-copy dump: `backups/bloli-nearby-20261027T090704Z.dump`; verified archive listing (`logs/volume-pre-backup-toc.txt`). Disk check: 533 GiB free; old PGDATA approximately 1.2 GiB, retained import data 4.7 GiB.
- Created labelled, initially empty target volumes after verifying target names absent. Import-data copy runs under its existing flock with source read-only, while app/DB stay online; complete SHA256 and metadata comparison required before DB downtime. The next entries record actual completion/startup verification.
