# Water rollout protocol — 2026-10-27

Status: deployed and verified. All four public sites passed final API/browser checks; source and documentation are synchronized through the final documentation commit.

## Scope and unchanged resources

- Fourth profile/category: `water.bloli.com` / `water`; Germany coverage. Austria/Romania expansion remains on hold.
- Shared stack: `bloli-nearby-web`, `bloli-nearby-api`, `bloli-nearby-db`; images use `bloli-nearby-*` and Compose project `bloli-nearby`.
- Checkout `/home/oliver/stack/bloli-nearby`; database/login `bloli_nearby` / `bloli`; active volumes `bloli-nearby_postgres_data` and `bloli-nearby_import_data`. No new permanent services or host ports. Old `find-a-loo_*` rollback volumes were not removed or rebound.
- Existing Docker `nginx` kept running, using external `nginx_default` and shared `/etc/nginx/conf.d/bloli-nearby-proxy.inc`. No unrelated vhosts or certificate lineages changed.

## Preflight and backup

- DNS: Water A resolved to `173.212.194.159`, no AAAA answer. Three original sites and DB were healthy; disk headroom527GiB before rollout.
- Starting revision `30920c1`; original counts: toilets25,954, tobacco107,861, kebab11,267, settlements196,951. Original source `https://download.geofabrik.de/europe/germany-261025.osm.pbf`, dataset timestamp `2026-10-25T21:21:21Z`.
- Saved private `backups/compose-before-water.yaml`, `backups/env-before-water`, `backups/nginx-before-water.conf` and `backups/renewal-hook-before-water`. Logs: `logs/water-before-{revision,containers,data,refresh-units,timers}.*`.
- Ran `scripts/backup.sh`; verified `backups/bloli-nearby-20261027T163618Z.dump` with `docker compose exec -T db pg_restore --list`. TOC: `logs/water-pre-backup-toc.txt`; path: `logs/water-pre-backup-path.txt`.
- Backups/config/logs remain ignored and private; no passwords, dumps or PBFs committed.

## Source, images and deployment correction

- Implementation `a0865c9` adds Water classification, four-category atomic import, seasonal mapped-hours handling, separate DE/EN/RO, original SVG artwork, initial HTML and fourth-host routing.
- Preserved previous runtime tags `bloli-nearby-{api,web,importer}:before-water` before building.
- First candidate deployment failed API health because a private `umask077` used during checkout made changed root-owned COPY inputs unreadable to the non-root API user (`EACCES /app/package.json`). Restored previous API/web image tags immediately; existing data was unchanged. Logs: `logs/water-app-deploy.log`, `logs/water-restore-before-images.log`.
- Fix `3c1fe87`: API COPY inputs explicitly owned by `node:node`; final static files explicitly readable in web image. Subsequent source checkout/build uses `umask022`; private backups keep077.
- Rebuilt shared images; validated actual API package/source/schema readability as its `node` runtime user and Water HTML/favicon readability as Nginx's worker user before switching. `logs/water-image-readability.log` records `API_RUNTIME_READABLE` and `WEB_RUNTIME_READABLE`.
- `docker compose up -d --wait api web` then succeeded; all services healthy. Build/deploy logs: `logs/water-build{,-permissions}.log`, `logs/water-app-redeploy.log`. DB and Docker Nginx were not recreated.
- Live Loo/Kippe/Kebab browser/API verification passed after corrected deployment, including real tiles, phone widths/languages and no page errors.

## Data import

- Paused only `bloli-nearby-refresh.timer`; confirmed refresh service was inactive before starting manual import.
- Ran:

```sh
docker compose --profile tools run -d --name bloli-nearby-water-import \
  -e DATA_URL=https://download.geofabrik.de/europe/germany-261025.osm.pbf \
  -e MIN_WATER_POINTS=100 importer
```

- Import logs confirmed checksum-verified reuse of `/data/source.osm.pbf`; no Germany PBF redownload. Filters regenerated to include explicit water/refill evidence. The existing importer limit remains2CPUs/4GiB.
- Shared data path remains `/var/lib/docker/volumes/bloli-nearby_import_data/_data`, including `source.osm.pbf`, `source.url`, checksum and extracted data. No separate Water source volume. Browser map tiles still load directly from OpenStreetMap.

## TLS and renewal

- Installed `deploy/nginx/water.bloli.com.http.conf` into the Nginx configuration volume as `/etc/nginx/conf.d/water.bloli.com.conf`; validated then gracefully reloaded.
- Issued Water TLS using `/snap/bin/certbot certonly --webroot -w /var/lib/dehydrated/acme-challenges`, the existing ACME account and `-d water.bloli.com`. Reused existing account; no new credentials in Git.
- Certificate expires `2027-01-25T15:39:29Z`. Certificate files: `/etc/letsencrypt/live/water.bloli.com/{fullchain,privkey}.pem`; issuance evidence `logs/water-cert-issuance.log`, details `logs/water-certificate-info.txt`.
- Extended `/etc/letsencrypt/renewal-hooks/deploy/50-bloli-nearby-nginx-reload` to accept Water as well as Loo/Kippe/Kebab, retaining mode755 and Nginx validation before graceful reload.
- All four renewal dry runs with deploy hooks passed using `/snap/bin/certbot renew --cert-name DOMAIN --dry-run --run-deploy-hooks --no-random-sleep-on-renew`; evidence `logs/water-rollout-renewal-DOMAIN.log`. Existing `snap.certbot.renew.timer` remains active.
- Existing unrelated Nginx deprecation/protocol warnings remain unchanged; all required Nginx configuration checks succeeded.

## Verification and operator instructions

- Local: unit46, Python importer28, isolated PostGIS13, font-loaded Chromium30 and WebKit16 checks passed; production build passed. Inspected Water desktop and320px phone screenshots. Separate sample DB contains6WC/8tobacco/8kebab/8water/2settlements, preserving the old development DB.
- Fresh review identified missing Water relation geometry validation, inactive non-amenity sources and a seasonal daily-hours loophole. Each was reproduced RED, corrected and verified GREEN; no deferred minor findings.
- Temporary worktree dependency symlink initially blocked Vite font requests; replaced it with `npm ci` and reran font-loaded browser verification successfully. No production font-serving issue remained.
- Updated repository About via personal Firefox session to include drinking-water points. Updated README, native development, data-storage, production update and Water-specific setup/rollback docs.
- Native API/Vite/inspector listeners stopped; local DB container stopped with sample data preserved.
- Routine app and data update commands are separate: see [production updates](production-updates.md) and [Water setup](water-site.md). Never run an older three-category importer against an active four-category database; pause refresh before incompatible rollback.

## Successful publication and HTTPS activation

- Import published successfully at `2026-10-27T16:54:38.344249Z`. Counts: **14,620 Water locations**, toilets25,954, tobacco107,861, kebab11,267 and settlements196,951. Shared source identities158,779. The original three counts, source URL and source timestamp match pre-import values exactly.
- Persisted `MIN_WATER_POINTS=1000` in private VM `.env`; the normal0.75 previous-count ratio remains active. Scheduled refresh still uses the existing latest-source configuration; only the first Water run explicitly pinned the retained dated source.
- Post-import backup `backups/bloli-nearby-20261027T165546Z.dump` verified by `pg_restore --list`; evidence `logs/water-post-backup-toc.txt` and `logs/water-post-backup-path.txt`.
- Initial internal readiness probe used Node fetch, which ignored the custom Host header and returned421UNKNOWN_SITE. Repeated with native `node:http` and the exact Water Host:200ready=true,count14620. This was an operator probe issue, not missing data or public host routing. Successful readiness evidence `logs/water-internal-readiness.json`.
- Installed final `deploy/nginx/water.bloli.com.https.conf`, validated Nginx and gracefully reloaded. Evidence `logs/water-https-{nginx-test,reload}.log`. Water now uses the existing shared proxy/upstream.
- Saved full import log `logs/water-germany-import.log`, before/after data JSON and import timing logs. Removed only the completed `bloli-nearby-water-import` container after success; `logs/water-completed-import-cleanup.txt` records it. Generic data volumes and old rollback copies remain intact.
- Resumed and verified `bloli-nearby-refresh.timer` active after the controlled import. Its normal weekly schedule and the daily backup timer remain unchanged.
- Actual one-off rollout scripts are preserved privately under `logs/water-rollout-scripts/` in the project directory for audit (including the corrected final readiness/activation script). These generated scripts/logs are ignored by Git.

## Final public verification

- All four public domains passed `node scripts/check-multi-site-production.mjs`: host-specific initial HTML/canonical, correct profile/category readiness, filters/radius, directions, real loaded OSM tiles, DE/EN/RO at320/390/430px and zero browser page errors.
- Water reports14,620 locations; the5km API probe around München81243 returned34 mapped Water results. Final evidence: `logs/verification-water-final.json`; prior existing-site evidence: `logs/verification-existing-sites-during-water.json`.
- Actual runtime code is `3c1fe87` (feature `a0865c9` plus ownership correction). Later source commits update operator documentation and this protocol, without requiring another app image build or data import.
- Final operational snapshots: `logs/water-final-containers.txt`, `logs/water-final-timers.txt`. Refresh, backup and certificate-renewal timers remain active; app ports remain internal-only.
