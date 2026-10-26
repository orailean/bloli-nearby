# Find a Loo

A public-toilet finder for Germany, with German, English and Romanian interfaces. React, Leaflet, Lucide icons, Node.js and PostGIS. The browser loads public OpenStreetMap tiles directly; toilet searches and town/postcode lookup use your own database. No Google API key or paid map subscription is required.

The interface includes free/paid filters, unknown-price labels, straight-line distances, accessible details, external Google Maps walking directions, and a playful visual identity with reduced-motion support. Translation dictionaries live separately in `src/web/locales/en.json`, `de.json`, and `ro.json`.

## Run locally with Docker Compose

Requires Docker Engine/Desktop and Compose v2.24.4 or newer (the production override uses `!reset`). PostGIS's pinned image runs as amd64; Apple Silicon uses emulation. Commands run only against your current Docker context: check it before use. Nothing in this repository automatically connects to Contabo.

```bash
scripts/setup-local.sh
# Edit .env and set CONTACT_EMAIL to your real public contact address.
docker compose up -d --build
```

Open <http://localhost:8088>. Before importing, the interface explicitly reports that data is not ready. Container health checks indicate service liveness; `/api/ready` also checks whether the initial dataset is present. Starting/restarting the application does not trigger a download.

## Import Germany data

The full Germany PBF is a substantial download. Initial runtime and disk usage depend on the host. The measured small-region trial is recorded in [verification](docs/verification/implementation.md); full-country import has not been benchmarked on the production host. Start with at least 30 GB free for downloads, filtered data and staging, and keep additional database backup space. This is conservative initial guidance, not a measured full-country guarantee.

```bash
docker compose --profile tools build importer
scripts/update.sh
```

The importer resolves a dated Germany PBF snapshot, fetches its published MD5 first, reuses matching verified cached files or downloads and verifies the source, downloads the coverage polygon, filters relevant OSM entities with osmium, reconstructs areas with pyosmium, and publishes a validated snapshot transactionally. MD5 is used for comparison with Geofabrik's provided checksum; transport uses HTTPS. Incomplete toilet geometry, missing completion records, malformed records, timestamp regression, fewer than the configured minimum counts, or a count drop below 75% of the previous snapshot fail publication. The old snapshot stays available.

The importer has a filesystem lock covering the download and a database advisory lock covering publication. Source identities are deduplicated, and private/customer/key-only toilets are excluded. Missing or conditional fees remain unknown. Restricted venues are not presented as unrestricted public toilets. Incomplete settlement boundaries clipped at extract borders are reported in the completion record; incomplete toilet geometry is a hard failure.

`DATA_URL`, `POLY_URL`, `MIN_FACILITIES`, `MIN_SETTLEMENTS`, and `MIN_IMPORT_RATIO` are configurable in `.env`. Lower minimum counts are only for explicitly regional development samples. Do not replace an existing Germany dataset with a small sample or lower validation thresholds simply to bypass a failing update. Same-named settlements include source region/postcode when available, with a clearly labeled nearby-city context or coordinates as fallback.

### Optional small regional development sample

Use a fresh local database/Compose project for a sample, not an existing production dataset. In that project's `.env`, set:

```dotenv
DATA_URL=https://download.geofabrik.de/europe/germany/bremen-latest.osm.pbf
POLY_URL=https://download.geofabrik.de/europe/germany/bremen.poly
MIN_FACILITIES=1
MIN_SETTLEMENTS=1
```

Then run `scripts/update.sh`. Regional coverage is intentionally limited; importing a Bremen extract does not create Munich results. The production defaults cover Germany. The UI's chosen example is München / 81243.

## Local debugging (only the database in Docker)

Use [the local debugging guide](docs/development/local-debugging.md) with `compose.dev.yaml`: PostGIS runs in Docker, and the API/Vite run directly on your machine with IDE breakpoints. It also documents optional Bremen and München/81243 samples. The optional Munich download is documentation only; local verification used Bremen.

## Development and tests

Node.js >=22.12 is required; the pinned container runtime is Node 22.22.0. Use an isolated PostGIS database for tests: integration tests truncate the app tables. Never point `TEST_DATABASE_URL` at production.

```bash
npm ci
# In one terminal, point DATABASE_URL at a local PostGIS database and run:
npm run dev:api
# Or npm run debug:api to expose the inspector on localhost:9229.
# In another terminal:
npm run dev
npm test
npm run build
# Set TEST_DATABASE_URL to a separate disposable PostGIS database:
npm run test:integration
npm exec playwright -- install chromium
npm run test:e2e
```

The browser suite uses its local PostGIS dataset and blocks public map tiles for repeatable tests without loading the shared tile service. Populate that isolated database with the Bremen development extract before browser tests. See [verification](docs/verification/implementation.md) for the exact local run and results.

Python extractor tests:

```bash
python3 -m venv .venv
.venv/bin/pip install -r importer/requirements.txt
.venv/bin/python -m unittest discover -s importer -p 'test_*.py'
```

## Production updates and data locations

- [Update, verify, and roll back production](docs/deployment/production-updates.md).
- [Downloaded Germany data, Docker volumes, and progress inspection](docs/deployment/data-storage.md).
- [VM deployment protocol](docs/deployment/protocol-2026-10-26.md).

## Operations

Defaults cap the importer at 2 CPUs / 4 GiB RAM, the database at 1.5 CPUs / 1536 MiB, the API at 0.75 CPU / 384 MiB, and the gateway at 0.5 CPU / 128 MiB. Limits constrain a shared host; they are initial settings to measure during the full-country import. If an import exceeds its limit, the transaction rolls back; inspect resource usage, retain the previous dataset, and increase limits deliberately before retrying. The import volume retains downloaded/extracted input for diagnosis; ensure adequate disk space and do not start overlapping heavy jobs.

Check dataset date, counts and the latest import outcome at `/api/status`. Dataset age greater than 14 days is marked stale; displayed source hours do not claim live availability. The refresh supervisor records job status before download/extraction, so preparation failures are visible in the latest job as well as logs. On the next lock-owning run, abandoned running jobs are marked interrupted. Review container logs and monitor the command’s exit status for details. Never log search query URLs or user coordinates routinely.

Schedule weekly updates with a host timer/cron later, after a successful manual import. For example, using the real deployment path:

```cron
15 3 * * 0 cd /absolute/path/to/find-a-loo && ./scripts/update.sh >> /var/log/find-a-loo-import.log 2>&1
```

The importer lock makes overlapping invocations fail rather than overlap. Monitor nonzero exit codes; rotate the log. No scheduler is installed automatically.

### Backup and restore

```bash
scripts/backup.sh
# Explicitly replaces this app's current database; take a backup first:
scripts/restore.sh --replace-database backups/loo-TIMESTAMP.dump
```

The custom-format dump includes the active dataset, coverage, facilities, settlements and job metadata. Operational scripts use `scripts/compose.sh` to preserve the active deployment’s Compose files, including the production proxy network override; an explicit `COMPOSE_FILE` takes precedence. Back up `.env` and `.secrets/db_password` separately in secure storage, and retain the exact application image/version. Never commit credentials. A restore stops only this app's API/gateway, runs a transactional `pg_restore`, then restarts them on success. The shared Docker Nginx is untouched. Rehearse restores against a separate local deployment before relying on backups.

Map-provider rollback is configuration-only: restore prior `TILE_URL`, `TILE_ATTRIBUTION`, and `TILE_MAX_ZOOM` in `.env`, then recreate only the API (`docker compose up -d api`); reload the browser to receive the updated map settings. For app rollback, use prior pinned images/configuration and restore a pre-migration dump when schema compatibility requires it. Do not delete volumes as a routine rollback step.

## Contabo deployment and HTTPS

Use the existing Docker Nginx and the prepared [Contabo Nginx/Let's Encrypt guide](docs/deployment/contabo-nginx.md) for `loo.bloli.com`. It includes all virtual-host configuration, HTTP bootstrap, webroot issuance, automatic renewal, Docker reload hook, and rollback commands. It also documents the observed duplicate renewal schedulers and unrelated renewal failures.

The app's production network override is ready:

```bash
docker compose -f compose.yaml -f compose.production.yaml config --quiet
# Run on the host only after deployment is authorized:
docker compose -f compose.yaml -f compose.production.yaml up -d --build
```

This attaches the app gateway to `nginx_default` as `find-a-loo-web` and removes its local host-port mapping. It does not create or reconfigure the shared Nginx. Use the same production file arguments for subsequent operations on that deployment. Full host deployment and certificate issuance have not been performed; the owner explicitly requested no host changes.

## Map policy, privacy and licenses

- Normal interactive OSM raster tiles: attribution stays visible, browser caching is honored, Referer is preserved, and there is no tile proxy, bulk download, offline pack, or prefetch. Public tiles have no availability guarantee; configure another permitted provider if usage grows. [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/).
- The tile provider receives the user's IP and viewed tile coordinates. Local search coordinates are used transiently and aren't stored as location history. The browser stores only the explicit language preference. Opening directions sends the destination to Google Maps.
- Toilet and settlement data are from OpenStreetMap via Geofabrik under ODbL. Display attribution, retain source information, and provide the applicable database offer under ODbL when publicly distributing a derived database. [OSM copyright](https://www.openstreetmap.org/copyright), [Geofabrik downloads](https://www.geofabrik.de/data/download.html).
- Lucide icons: ISC. Leaflet: BSD-2-Clause. React, Vite, pg and tsx: MIT; TypeScript: Apache-2.0. DM Sans and Bricolage Grotesque: SIL Open Font License. pyosmium: BSD-2-Clause; Shapely: BSD-3-Clause. Container images include additional packages with their own notices. See `package-lock.json`, importer requirements, and [notices](THIRD_PARTY_NOTICES.md).

### Search area and Open now

Changing the radius updates the results and fits the map to a visible search boundary on desktop and mobile. Results are capped at 100 nearest matching toilets, so increasing an already crowded search can keep the same first 100 results; the interface indicates truncation.

**Open now** evaluates recorded OSM hours on the server in `Europe/Berlin`, including daylight saving time. It combines with price and radius filters before applying the result cap. Missing, invalid or uncertain schedules are excluded; holiday-dependent schedules also require state context. Results refresh every minute while this filter is active. Opening status reflects mapped schedules, not a live confirmation from the operator.
