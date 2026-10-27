# Kebab: third shared site

Kebab uses `kebab.bloli.com` and the existing Bloli Nearby web/API/PostGIS/importer stack. No extra permanent containers or host ports are required. The owner-requested Compose/volume rename preserves verified data copies; database/login, secret, edge alias, host ports and schedules remain unchanged. See [volume migration](volume-name-migration.md).

## Data and updates

The importer publishes toilets, tobacco and kebab plus settlements from one verified Germany snapshot, atomically. Cuisine tokens kebab/doner/doener/döner on fixed restaurants/fast-food places qualify, with case/semicolon handling. Restricted/inactive venues are excluded. Missing fixed geometry, incomplete streams, invalid thresholds, suspicious count drops or omitted active categories reject publication and retain all active datasets.

`MIN_KEBABS` controls the independent food floor; first-import default is 100, followed by measured production configuration and the existing `MIN_IMPORT_RATIO=0.75` previous-count protection. Existing WC/tobacco floors remain independent. After Kebab activation do not run an old one/two-category importer against production.

Visible map tiles load directly from OpenStreetMap in the browser. The weekly systemd job imports locations, not raster tiles. The UI dataset date comes from the OSM snapshot; `/api/status` separately reports `importedAt`, readiness and the latest import outcome.

```bash
cd /home/oliver/stack/bloli-nearby
scripts/backup.sh
git rev-parse HEAD
git pull --ff-only
docker compose --profile tools build api web importer
docker compose up -d --wait api web
# Only when data/code changes require a refresh; otherwise wait for the weekly timer.
scripts/update.sh
```

Use `systemctl list-timers --all bloli-nearby-refresh.timer` and `sudo journalctl -u bloli-nearby-refresh.service -n 100 --no-pager` to inspect automation. The existing weekly Sunday 03:15 + up to 30-minute jitter and daily backup schedule are unchanged. Retained downloads live in `bloli-nearby_import_data`, not a checkout data directory.

## Domain and certificate setup

1. Verify the owner-created A record points to 173.212.194.159, without a conflicting AAAA record.
2. Take a backup and verify it, record existing counts/images/source, and deploy the compatible additive schema/API/web/importer. Confirm Loo/Kippe remain healthy.
3. Run the initial three-category import with the checksum-verified retained dated source. Confirm all three `/api/ready` responses using their Host headers internally, category isolation and unchanged WC/tobacco counts for that same snapshot before activating the new HTTPS vhost.
4. Install `deploy/nginx/kebab.bloli.com.http.conf` into `/etc/nginx/conf.d/kebab.bloli.com.conf` inside the existing Docker Nginx configuration volume. Validate `docker exec nginx nginx -t`, gracefully reload, and verify a public file under the existing `/var/lib/dehydrated/acme-challenges/.well-known/acme-challenge/` webroot. Do not recreate shared Nginx.
5. Issue only the new Kebab certificate through the existing Certbot account/webroot, using the existing Snap command `/snap/bin/certbot` (host `/usr/bin/certbot` is an older installation), `certonly --webroot -w /var/lib/dehydrated/acme-challenges -d kebab.bloli.com --non-interactive --agree-tos --account ACCOUNT_ID`. Reuse the existing account; no new public contact details are inferred.
6. Install the executable `deploy/letsencrypt/50-bloli-nearby-nginx-reload` deploy hook into `/etc/letsencrypt/renewal-hooks/deploy/`. It scopes validation/reload to the three app domains. Certbot's existing renewal scheduler remains responsible for renewal.
7. Replace the bootstrap vhost with `deploy/nginx/kebab.bloli.com.https.conf`. It includes the existing `bloli-nearby-proxy.inc`, so upstream, headers and timeouts match the other public sites. Validate before gracefully reloading.
8. Verify all three live sites and run per-domain `sudo /snap/bin/certbot renew --cert-name DOMAIN --dry-run --run-deploy-hooks --no-random-sleep-on-renew`. Save logs and backup references in the dated protocol.

Only execute the new-domain activation after readiness. During certificate bootstrap the new HTTP domain may show the setup response; existing domains keep their normal routing. If a validation fails, retain/reinstate the previous config and keep the existing Nginx running.

## Verification and rollback

`node scripts/check-multi-site-production.mjs` checks all three public hosts, metadata, readiness, filtered discovery, real map images, directions, radius, languages and phone widths. `SITES=loo,kippe` limits checks while the new domain is still pending activation. Browser automation needs network/local browser permissions in a sandboxed session.

Record the pre-deployment commit/images/config and verified dump. Prefer reverting app images/new vhost while preserving additive schema and all data. Once three categories are active, keep the new compatible importer or pause only its timer during a controlled rollback; an old importer could otherwise ignore the third category. Full restore is the last resort using the documented verified backup, not volume deletion. Document any paused timer and restart it after verification. Preserve the production volume identities and unrelated Nginx services.

Source code, configuration, synthetic fixtures and documentation are committed. Certificates, credentials, dumps, datasets, generated fonts/builds and screenshots are not.
