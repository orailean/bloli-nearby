# ATM and Stay deployment

ATM (`atm.bloli.com`, category `atm`) and Stay (`stay.bloli.com`, category `accommodation`) extend the existing stack to eight sites: Loo, Kippe, Kebab, Water, Transit, Charge, ATM and Stay. They share the existing API, PostGIS database, country-aware importer, import volume and `bloli-nearby-web` gateway alias on `nginx_default`. The existing Docker Nginx continues to own ports 80/443. No new service, published port or volume is needed.

All eight sites support German, English, Romanian and Hungarian. German remains the fallback. Coverage follows active countries, rather than promising that every supported country is already active. ATM details describe mapped cash machines, access, currencies and fee information; they do not guarantee cash stock or current fees. Stay describes mapped accommodation, not live room availability, booking prices or reservations.

## Prepare and measure eight-category data

The importer now extracts toilets, tobacco sellers, kebab places, water points, transport stops, charging stations, ATMs and accommodations together, plus settlements. Use this eight-category importer for subsequent refreshes. Do not run an older six-category importer after publication.

Retain the checksum-verified pinned source and associated files in the existing import volume under `/data/countries/de`, `/data/countries/ro`, `/data/countries/at` and `/data/countries/hu`. Each directory keeps `source.osm.pbf`, `source.md5`, the dated source URL in `source.url`, `coverage.poly` and source-bound `transit-context.sqlite` / `transit-context.source`. Rebuild the filtered extract and `extracted.jsonl` with the new extractor. Preserve pinned source files and context for reproducibility; neither source data nor generated JSONL belongs in Git. Temporary space is required for filtering and extraction. These are OSM source files, not rendered map tiles.

Before the first eight-category publication, record the current commit, country activation states, source fingerprints, existing six-category counts and configured floors. Take a backup with `scripts/backup.sh` and verify it with `pg_restore --list`. Pause the shared refresh timer and ensure no importer is running before manual preparation. Preparation and measurement must use the new importer image and the same retained country snapshot used for the before/after comparison.

For the controlled rollout, prepare and measure with **both** `USE_RETAINED_SOURCE=1` and `MEASURE_ONLY=1`. Retained mode reads the existing `source.url` and `source.md5` and verifies the local PBF checksum; it does not resolve a newer dated source or download replacement source metadata. Missing or mismatched retained files must be investigated before proceeding.

After building the new importer, re-extract and measure Germany through the existing locked importer entrypoint:

```bash
scripts/compose.sh --profile tools run --rm --no-deps \
  -e COUNTRY_CODE=de -e USE_RETAINED_SOURCE=1 -e MEASURE_ONLY=1 importer
```

Repeat with `COUNTRY_CODE=ro`, `at` and `hu`. `MEASURE_ONLY=1` runs preparation and validates/counts the complete eight-category extract without publishing; require `published: false` in the result. It does not activate a pending country. A previously generated six-category `extracted.jsonl` cannot measure the new categories; regenerate it first using this retained-source mode.

Record each country's source fingerprint, measured counts and SHA-256 of its completed `extracted.jsonl` in the rollout protocol. Keep the refresh timer paused and prevent any intervening preparation or refresh from replacing these measured files. The standalone CLI also supports `node --import tsx src/server/import-cli.ts FILE --measure-only` to recheck a prepared file without publication.

Set independent positive production count floors from the measured eligible counts:

| Country | ATM floor     | Accommodation floor     |
| ------- | ------------- | ----------------------- |
| Germany | `MIN_DE_ATMS` | `MIN_DE_ACCOMMODATIONS` |
| Romania | `MIN_RO_ATMS` | `MIN_RO_ACCOMMODATIONS` |
| Austria | `MIN_AT_ATMS` | `MIN_AT_ACCOMMODATIONS` |
| Hungary | `MIN_HU_ATMS` | `MIN_HU_ACCOMMODATIONS` |

Choose conservative floors below verified eligible counts with room for normal source variation, while still rejecting incomplete extraction. Preserve existing category floors and `MIN_IMPORT_RATIO`; do not lower them to force publication. Store measured production values in the VM `.env`, and confirm the importer receives them. Local sample counts are unsuitable production floors.

After setting and verifying the measured floors, publish the **exact measured `extracted.jsonl`**, without rerunning preparation or selecting a newer source. Recheck its recorded SHA-256 immediately before publication. For Germany, replace `RECORDED_SHA256` with the hash saved during measurement:

```bash
scripts/compose.sh --profile tools run --rm --no-deps \
  -e COUNTRY_CODE=de -e EXPECTED_EXTRACT_SHA256=RECORDED_SHA256 \
  --entrypoint sh importer -c '
    set -eu
    exec 9>/data/import.lock
    flock -n 9
    actual=$(sha256sum /data/countries/de/extracted.jsonl | cut -d " " -f 1)
    [ "$actual" = "$EXPECTED_EXTRACT_SHA256" ]
    node --import tsx src/server/import-cli.ts /data/countries/de/extracted.jsonl
  '
```

The checksum guard stops publication if the prepared file differs from the measurement. Repeat for `ro`, `at` and `hu`, changing `COUNTRY_CODE`, both file paths and the recorded checksum. This direct publication reads the prepared JSONL and does not call `prepare.sh`. Require `published: true`, and compare the published counts and source fingerprint with the measurement. Publication replaces a country's eight category snapshots atomically after validation; a failure preserves the previous country snapshot. Keep the staged country activation order and verify eight category snapshots before any pending-country activation.

Do not use `scripts/refresh-countries.sh` for this controlled bootstrap: it normally selects the latest upstream snapshot and would break the measured-source comparison. Once rollout checks and the post-publication backup pass, resume the existing timer. Normal post-rollout refreshes, including targeted `scripts/refresh-countries.sh de` / `ro` / `at` / `hu` retries, may select a newer dated upstream source. Scheduled refreshes process active countries sequentially with a separate outcome per country. Do not set `USE_RETAINED_SOURCE=1` or `MEASURE_ONLY=1` permanently for the normal latest-data schedule.

## Deploy from main

Production checkout: `/home/oliver/stack/bloli-nearby` on `ssh-contabo`. These are operator instructions; preparing this change does not apply anything to the VM. Use the production Compose configuration already retained by `.env`.

```bash
cd /home/oliver/stack/bloli-nearby
git status --short
git rev-parse HEAD
scripts/backup.sh
umask 022
git switch main
git pull --ff-only origin main
scripts/compose.sh build api web importer
scripts/compose.sh up -d --wait --wait-timeout 180 api web
scripts/compose.sh ps
```

Resolve intentional local changes before pulling. Record the previous commit and verified backup. Application startup applies schema setup but does not download or import country data. Complete measurement, configure floors and publish the new categories separately. See [production updates](production-updates.md) for backup, scheduled refresh and rollback procedures; its older six-site lists need extending to all eight hosts for this release.

## Existing Docker Nginx and automatic TLS renewal

Verify both new DNS names reach the existing proxy, including any published IPv6 record. Back up the current Nginx configuration and certificate state. Install each new [ATM HTTP bootstrap](../../deploy/nginx/atm.bloli.com.http.conf) and [Stay HTTP bootstrap](../../deploy/nginx/stay.bloli.com.http.conf) as its own `/etc/nginx/conf.d/DOMAIN.conf` in the existing Docker Nginx configuration volume. Use `docker cp`, test with `docker exec nginx nginx -t`, and reload with `docker exec nginx nginx -s reload` only after validation succeeds.

Both bootstrap templates retain the existing HTTP-01 webroot `/var/lib/dehydrated/acme-challenges`. Verify an externally reachable challenge before issuing a certificate through the current Snap Certbot account:

```bash
sudo /snap/bin/certbot certonly --webroot \
  -w /var/lib/dehydrated/acme-challenges \
  --cert-name atm.bloli.com -d atm.bloli.com
sudo /snap/bin/certbot certonly --webroot \
  -w /var/lib/dehydrated/acme-challenges \
  --cert-name stay.bloli.com -d stay.bloli.com
```

Then install the [ATM HTTPS vhost](../../deploy/nginx/atm.bloli.com.https.conf) and [Stay HTTPS vhost](../../deploy/nginx/stay.bloli.com.https.conf) over their bootstrap files. Each uses the shared [proxy include](../../deploy/nginx/bloli-nearby-proxy.inc), which resolves `bloli-nearby-web:80` through Docker DNS and preserves the hostname. Certificate paths assume the named lineages `/etc/letsencrypt/live/atm.bloli.com/` and `/etc/letsencrypt/live/stay.bloli.com/`; check Certbot's output and adjust paths if existing lineages cause a suffix. The templates follow the existing Nginx 1.25.4 `http2 on` syntax. Validate in the running proxy before reloading; restore the previous configuration if validation fails.

Install the updated, eight-domain-scoped [renewal deploy hook](../../deploy/letsencrypt/50-bloli-nearby-nginx-reload) executable at `/etc/letsencrypt/renewal-hooks/deploy/50-bloli-nearby-nginx-reload`. Use the existing Snap Certbot renewal timer. The hook tests the existing Docker Nginx configuration and gracefully reloads it after successful renewal. Extend the shared hook rather than installing a second new ATM/Stay hook. The historical `50-loo-nginx-reload` repository template is superseded by the shared hook; inspect any installed legacy hook to avoid duplicate reloads for Loo.

```bash
for domain in loo.bloli.com kippe.bloli.com kebab.bloli.com water.bloli.com transit.bloli.com charge.bloli.com atm.bloli.com stay.bloli.com; do
  sudo /snap/bin/certbot renew --cert-name "$domain" --dry-run --run-deploy-hooks --no-random-sleep-on-renew
done
```

Keep the shared Nginx container, certificate mounts and unrelated vhosts unchanged. The [existing TLS guide](contabo-nginx.md) explains webroot verification and renewal troubleshooting. It contains historical names and observations; the upstream for these templates is `bloli-nearby-web`.

## Verify the release

Check every hostname's HTTPS shell, canonical URL, title, description, theme and favicon, `/api/site`, `/api/ready`, `/api/status`, a real search and map tile loads. Check ATM and Stay results around Munich, Bucharest, Vienna and Budapest only where the corresponding country is active. Verify category filters, unknown values, mapped access restrictions and Google Maps directions. Confirm DE/EN/RO/HU on desktop and narrow screens, including privacy copy and country labels; keep uncertain source details explicit.

Compare existing six-category counts against the recorded source fingerprints, verify all eight category readiness states, and check a failed refresh retains the prior country snapshot. Take and verify a post-publication backup, record measurements, configured floors, sources, checksums, timings, certificate lineages and public checks in the release protocol, then resume the existing refresh timer. Before any incompatible rollback, pause the importer and use compatible eight-category code or a separately verified matching restore; preserve the current volumes and backup.

For local debugging, use native Node API/Vite with Docker PostGIS only, as described in [local development](../development/multi-site.md). ATM and Stay use `http://atm.localhost:5173` and `http://stay.localhost:5173`. Production services remain the existing Docker stack.
