# Water deployment and updates

Water is the fourth shared profile at `https://water.bloli.com`, using category `water`. Loo/Kippe/Kebab retain their hosts and data. All use `bloli-nearby-web`, `bloli-nearby-api`, `bloli-nearby-db`, the shared importer image, existing PostGIS database/login and generic volumes. No new host ports or permanent services are needed.

## Classification and details

Include explicitly mapped `amenity=drinking_water`, `drinking_water=yes`, drinking fountains (`amenity=fountain` + `fountain=drinking`) and `drinking_water:refill=yes` partners. Explicit negative/uncertain potability, legal non-potability, inactive features and private/locked/key-only/conditional access are excluded. Customer access is allowed only for explicit refill partners and disclosed.

Water-specific fees/hours take precedence. Venue admission fees do not become refill fees. Missing fees/hours stay unknown. Seasonal points without an explicit annual/month schedule remain unconfirmed under Open now; nothing is inferred to be 24/7. Mapped data is not a live quality or flow check. Observe signs at the source.

## Initial rollout

1. Record current versions, counts, mounts, source identity and timers; verify a pre-change backup using the existing backup procedure.
2. Build compatible API/web/importer images and deploy the additive schema. Before public activation, regenerate all four categories from the retained verified Germany PBF. The configured source URL must match the retained dated snapshot if reusing it; checksum validation still applies.
3. Set `MIN_WATER_POINTS` from the measured initial result (bootstrap default100); the existing import ratio independently protects later Water replacements. All active categories must be declared in each replacement. Verify old-category counts for the same source and take a post-import backup.
4. Install `deploy/nginx/water.bloli.com.http.conf` in the existing Nginx configuration volume; test then gracefully reload Nginx. Reuse the current ACME webroot/account and `/snap/bin/certbot` to issue Water TLS.
5. Extend the existing renewal deploy-hook domain allowlist to include Water. Install the HTTPS vhost from `deploy/nginx/water.bloli.com.https.conf`, which uses `bloli-nearby-proxy.inc`; test then gracefully reload. Do not recreate shared Nginx.
6. Run `certbot renew --cert-name water.bloli.com --dry-run --run-deploy-hooks --no-random-sleep-on-renew` using `/snap/bin/certbot`, and verify existing certificates too. Run `node scripts/check-multi-site-production.mjs` for all four sites.

The dated Water protocol records actual commands, paths, versions and results after deployment.

## Routine updates

Use the existing [production update procedure](production-updates.md) from `/home/oliver/stack/bloli-nearby` with the active production Compose configuration. `scripts/update.sh` refreshes map data; it does not pull or deploy app code. Back up first; fetch/pull the reviewed revision, build images and recreate only affected app services. The weekly `bloli-nearby-refresh.timer` remains the combined data refresh; inspect it with `systemctl list-timers bloli-nearby-refresh.timer` and `journalctl -u bloli-nearby-refresh.service`. The import volume still holds `/data/source.osm.pbf` and source/checksum/extracted metadata, not web map tiles.

Do not run an old three-category importer once Water is active. During rollback pause the shared refresh timer before incompatible image/config changes. Prefer a compatible additive rollback; restore the verified pre-change dump only if a full data rollback is necessary. Preserve source/backup volumes and unrelated Nginx sites.
