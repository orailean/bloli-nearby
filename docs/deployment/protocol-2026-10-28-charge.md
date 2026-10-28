# Charge production rollout protocol — 2026-10-28

Status: deployed. Charge is live at `https://charge.bloli.com`; final live API/browser checks passed. Source-only application code is commit `1793309e718dbc72a39a5b1e31e441e2a664988b` (`Add Charge electric vehicle discovery site`), pushed to `main` and deployed on the VM.

## Scope and preserved services

- Added the sixth Germany profile/category: `charge` / `charge.bloli.com`.
- Kept the shared `bloli-nearby` Compose project and existing `bloli-nearby-api`, `bloli-nearby-web`, `bloli-nearby-db`, `bloli-nearby-importer` images/services. No permanent service or host port was added.
- The DB remains `bloli_nearby`, role `bloli`; active named volumes remain `bloli-nearby_postgres_data` and `bloli-nearby_import_data`. Docker Nginx remains on `nginx_default`; no host-global Nginx change was made.
- Austria and Romania remain out of scope. No map/data binaries, dumps, credentials, or private server config were added to Git.

## Preflight, backup and deployment

- Production checkout: `/home/oliver/stack/bloli-nearby`. DNS A record for `charge.bloli.com` points to `173.212.194.159`; no AAAA answer was present.
- Before rollout the existing sites and DB were healthy; host capacity was 8 CPUs, 29 GiB RAM and 527 GiB free disk. Existing categories were toilets 25,954, tobacco 107,861, kebab 11,267, water 14,620 and transit 799,433; settlements 196,951.
- Pre-change DB dump `backups/bloli-nearby-20261028T082536Z.dump` (193 MB) was verified with `pg_restore --list` inside the existing PostGIS image. Private rollback image archive: `backups/charge-pre-20261028T082536Z/images.tar` (663 MB), with prior `.env`, certificate hook, and Nginx vhost/config copies stored alongside it. These paths are ignored by Git.
- Paused `bloli-nearby-refresh.timer` during source preparation/publication. The first importer start resolved the moving `germany-latest` URL to a newer extract; it was stopped before download/publication. The retry pinned the already retained source snapshot explicitly. No data was published by the first attempt.
- Built and deployed compatible API/web/importer images from the commit above. Additive schema migration completed; API/web became healthy. Existing Nginx, database and original five site profiles stayed available.

## Source preparation and six-category publication

- Reused `/data/source.osm.pbf` (4.5 GiB, Germany extract dated `2026-10-25T21:21:21Z`) and `/data/transit-context.sqlite` (259.3 MiB). Pinned source URL: `https://download.geofabrik.de/europe/germany-261025.osm.pbf`; PBF MD5: `1a2bd3665c3e2507e1da99befd2ac228`. Source data is in Docker volume `bloli-nearby_import_data`, not in the checkout.
- Matching Transit context key: `https://download.geofabrik.de/europe/germany-261025.osm.pbf|1a2bd3665c3e2507e1da99befd2ac228|transit-context-v2`.
- The first optional low-memory source probe was killed with exit 137 at a 1 GiB cap. A read-only retry with a 3 GiB limit completed and recorded raw OSM charging-station tag evidence in the ignored server file `logs/charge-source-evidence.json`.
- Pinned preparation regenerated the filtered six-category PBF (112.5 MiB). Geometry-only preflight passed for 1,240,270 candidate records. Full extracted JSONL was 1.9 GiB. The import ran with the existing bounded importer allocation (2 CPUs / 4 GiB); available VM memory remained about 16 GiB and free disk stayed above 523 GiB during the run.
- Publication succeeded at `2026-10-28T09:31:37.905Z`. Counts: toilets 25,954; tobacco 107,861; kebab 11,267; water 14,620; transit 799,433; Charge 40,401; settlements 196,951. All previous category counts and the Germany source snapshot remained unchanged. Post-publication `ANALYZE` succeeded.
- Set `MIN_CHARGE_STATIONS=10000` in the private production `.env` as a conservative floor against the measured 40,401 eligible stations. No source data or environment secret was copied into this repository.
- An internal München query for `connector=ccs&minPowerKw=150` returned HTTP 200 with five eligible records.

## HTTPS and shared Docker Nginx

- Installed the HTTP bootstrap vhost in the existing Nginx config volume, verified `nginx -t`, then gracefully reloaded. Existing ACME webroot was used to issue the `charge.bloli.com` certificate; the existing Certbot account was reused. Certificate expiry: `2027-01-26 09:14:59 GMT`.
- Installed the repository deploy hook as `/etc/letsencrypt/renewal-hooks/deploy/50-bloli-nearby-nginx-reload`, executable. It validates the existing Docker Nginx config and gracefully reloads for the six Bloli Nearby certificate domains.
- Installed the HTTPS vhost, ran `nginx -t` successfully and gracefully reloaded. `https://charge.bloli.com/api/site` and `/api/ready` both returned 200 with Charge identity/readiness. All six domains returned HTTP 200 over HTTPS.
- Certbot on this VM rejected the newer `--run-deploy-hooks` option, so each app lineage was tested with the supported scoped `certbot renew --cert-name DOMAIN --dry-run --no-random-sleep-on-renew`. All six lineages passed. One initial Water staging challenge attempt failed transiently; its immediate retry passed. Certbot intentionally skips deploy hooks during dry runs, so the installed hook was then invoked with `RENEWED_DOMAINS` set to all six site domains. It passed `nginx -t` and gracefully reloaded the shared Nginx. The VM also has unrelated legacy certificate lineages; the app-scoped checks kept those separate.

## Post-import backup, cleanup and live verification

- Created `backups/bloli-nearby-20261028T101509Z.dump` (207,797,227 bytes) after import. `pg_restore --list` completed successfully using the existing PostGIS image.
- Removed only the completed `bloli-charge-source-probe` helper and the 1.3 MiB partial PBF left by the stopped moving-URL attempt. Preserved the verified Germany PBF, Transit context, database, active Compose volumes and both pre/post rollout backups.
- Restarted the previously enabled `bloli-nearby-refresh.timer`; `bloli-nearby-refresh.timer`, `certbot.timer` and `snap.certbot.renew.timer` all reported active. No importer or debug web/API containers were left running.
- `node scripts/check-multi-site-production.mjs` passed for all six HTTPS domains. It verified shell/profile/readiness, Munich results and category isolation, Charge connector/power/access filters, loaded map tiles, 320/390/430 px German/English/Romanian layouts, directions mode, controls, and no browser page errors. Reported counts matched the published data; all six sites used the same source timestamp and import timestamp.

## Operator notes

- Retained source files are under `/var/lib/docker/volumes/bloli-nearby_import_data/_data/` (inside containers: `/data/source.osm.pbf` and `/data/transit-context.sqlite`). They are not rendered tiles. See [data storage](data-storage.md), [production updates](production-updates.md), and [Charge deployment guidance](charge-site.md).
- Use the normal six-category refresh/update procedure. Never run an older five-category importer against the active database. For rollback, pause the refresh timer and use compatible six-category images; retain the active volumes and verified post-Charge dump.
