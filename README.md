# Bloli Nearby

One self-hosted OpenStreetMap discovery platform, two focused sites across Germany:

- **[Find a Loo](https://loo.bloli.com)** — public toilets, free/paid filters and mapped opening hours.
- **[Kippe](https://kippe.bloli.com)** — cigarette machines, tobacco shops and mapped tobacco-selling stores and petrol stations (unconfirmed tobacco sales are labelled). Machine/shop/petrol-station filters, recorded payment methods and hours; no stock guarantees.

Both share one React/Leaflet frontend build, Node API, PostGIS database and Germany importer. Site profiles select distinct branding, artwork, translations, metadata, filters and details by hostname. No paid API or Google Maps key is needed; directions open externally in Google Maps. Browser map backgrounds load normal public OSM tiles directly. Downloaded Germany data supplies local location and postcode searches, not self-hosted map tiles.

## Native local development

Use [the two-site debugging guide](docs/development/multi-site.md). Only PostGIS needs Docker; frontend/API run natively with IDE breakpoints. Small synthetic München/Bremen fixtures are included; no Germany download is required.

```bash
npm ci
# Copy .env.local.example to .env.local only if it does not already exist.
docker compose --env-file .env.local -f compose.dev.yaml up -d --wait
npm run dev:api # terminal 1
npm run dev     # terminal 2
```

Open `http://loo.localhost:5173` and `http://kippe.localhost:5173`. Both use the same services. For a fresh mixed sample database and `npm run seed:sample`, follow the guide; the seed command refuses to overwrite existing data. The [detailed local debugging guide](docs/development/local-debugging.md) also retains optional regional source workflows.

Translation JSON is separate under `src/web/locales/common/{de,en,ro}.json` and `src/web/sites/{loo,kippe}/locales/{de,en,ro}.json`. Unsupported browser languages fall back to German; an explicit language choice persists per origin. Site modules compose artwork, filters and details around common search/map behavior.

## Containers and production

Node >=22.12, Docker and Compose >=2.24.4 are required; the pinned PostGIS image uses amd64 emulation on Apple Silicon. `scripts/setup-local.sh` creates ignored local credentials when absent. `docker compose up -d --build` starts a fresh base stack; its strict gateway can be previewed with a public Host header, e.g. `curl -H 'Host: kippe.bloli.com' http://127.0.0.1:8088/`. Use native local hostnames for browser debugging.

For Contabo, use [the multi-site migration/update guide](docs/deployment/bloli-nearby-migration.md). Existing Docker Nginx remains the shared TLS proxy. The production override preserves the legacy Compose project identity and explicitly binds existing data/import volumes, while the package/repository is named `bloli-nearby`. No new application host ports are published. The canonical VM checkout is `/home/oliver/stack/bloli-nearby`.

Do not remove volumes or assume renaming a directory migrates Docker resources. The shared production database/login are `bloli_nearby` / `bloli`, configured through `DB_NAME` / `DB_USER`. Development Compose identity and legacy volume names remain intact. [Data locations](docs/deployment/data-storage.md) explain the host paths; historical deployment protocols retain original names as an audit record.

## Import and refresh

```bash
docker compose --profile tools build importer
scripts/update.sh
```

The importer resolves one immutable Germany snapshot and its published checksum, reuses matching retained files, filters both categories and settlements, reconstructs fixed geometries and atomically publishes validated data. For the initial multi-site extension, the [migration guide](docs/deployment/bloli-nearby-migration.md) pins the already-downloaded snapshot to avoid downloading Germany again. Subsequent weekly refreshes use one latest source for both sites.

Tag rules are documented in [tobacco classification](docs/implementation/tobacco-tagging.md). Lotto outlets, kiosks, convenience stores/Spätis, newsagents, supermarkets, shops offering Lotto and petrol stations are included by assuming cigarette sales, without a special sales label. Explicit tobacco=no is excluded. Customer/private restrictions, inactive places and explicit negative product tags are preserved or excluded appropriately. Unknown prices and payments remain unknown. Shop hours remain unknown unless mapped; machines without mapped hours are labelled as assumed open 24/7. Missing fixed toilet/seller geometry or a suspicious count/drop aborts publication and preserves the old active data. After both categories are active, WC-only imports are rejected rather than mixing shared source snapshots.

`DATA_URL`, `POLY_URL`, `MIN_FACILITIES`, `MIN_SETTLEMENTS`, `MIN_SELLERS` and `MIN_IMPORT_RATIO` are configurable. Regional/sample thresholds are for fresh development databases, not bypassing production validation. Importer resource limits are 2 CPUs/4 GiB; database 1.5 CPUs/1536 MiB, API 0.75 CPU/384 MiB, gateway 0.5 CPU/128 MiB. Check actual logs and measurements before adjusting them.

## Discovery behavior

Radius choices are **0.5, 1, 2, 3 and 5 km**, with **0.5 km default**. Radius changes update the list and fit a visible map boundary. Results are straight-line distance ordered and capped at 100 nearest matches with truncation indicated. Phones use natural page scrolling; desktops use a scrollable side panel. Tile failure leaves local search/list usable.

**Open now** evaluates mapped schedules in Europe/Berlin, including daylight saving time, before applying the result cap. Missing/invalid/uncertain schedules and unresolved regional-holiday schedules are excluded, except vending machines without mapped hours are treated as 24/7 and clearly labelled as an assumption. Explicit mapped schedules still take precedence. Active filtered searches refresh every minute. Opening status is based on recorded schedules, not operator confirmation or current inventory.

`/api/site`, `/api/status` and `/api/ready` resolve the request hostname. `/api/health` checks liveness only. `/api/locations` is site-scoped discovery; `/api/settlements` shares town/postcode search. The legacy `/api/toilets` route remains available only on Loo during migration. Unknown production hosts, cross-category overrides and unsupported filters are rejected.

## Verification

```bash
npm test
npm run build
npm exec playwright -- install chromium webkit
npm run test:e2e
# Only against an isolated disposable PostGIS database:
npm run test:integration
.venv/bin/python -m unittest discover -s importer
```

Set `TEST_DATABASE_URL` for integration tests; they truncate app tables. Never use production. Browser regressions cover both local hostnames, all languages, radius, map/list selection, Open now, filters, payment/access details and phone layouts. Tests block public tiles; live release verification separately requires actual tile images to load.

## Operations, backups and rollback

```bash
scripts/backup.sh
# Explicitly replaces this app's DB; take a backup first and follow the guide:
scripts/restore.sh --replace-database backups/bloli-nearby-TIMESTAMP.dump
```

Custom-format dumps include all location/category data, shared settlements, legacy toilets, coverage and job history. Back up `.env` and `.secrets` securely outside Git. Scripts preserve the active Compose file set through `scripts/compose.sh`. Restore stops only this app's API/web, uses transactional pg_restore and keeps shared Nginx running. Rehearse with a disposable database. Application rollback uses the recorded pre-migration commit/configuration; retain persistent volumes and use the verified backup when schema restoration is needed.

Production uses one weekly `bloli-nearby-refresh.timer` and one daily `bloli-nearby-backup.timer`, plus existing Certbot renewal with a deploy hook scoped to both domains. Refresh runs Sunday 03:15 Europe/Berlin plus up to 30 minutes jitter; backup runs daily 04:30 plus up to 15 minutes jitter. The [VM update schedule section](docs/deployment/bloli-nearby-migration.md#automatic-updates-on-the-vm) gives exact unit paths, status/log and manual-run commands. [Migration/update instructions](docs/deployment/bloli-nearby-migration.md) cover paths, DNS, certificate bootstrap/renewal, verification and rollback. Host operations are recorded in dated protocol files under `docs/deployment/`.

## Map policy, privacy and licenses

Normal interactive OSM raster tiles retain attribution, browser caching and Referer; there is no bulk tile download, proxy, offline pack or prefetch. Public tiles have no availability guarantee; a permitted alternative provider remains configurable. The provider receives IP/viewed tile coordinates. Searches do not store location history and query URLs are not logged routinely. Explicit language preference is stored locally; opening directions sends the destination to Google Maps.

Map/location data is © OpenStreetMap contributors under ODbL, via Geofabrik. Preserve source attribution and applicable database-sharing obligations. See [OSM copyright](https://www.openstreetmap.org/copyright), [tile policy](https://operations.osmfoundation.org/policies/tiles/) and [third-party notices](THIRD_PARTY_NOTICES.md). Downloaded PBFs, databases, dumps, screenshots, built assets and secrets remain outside Git. The repository is `git@github.com:orailean/bloli-nearby.git`.
