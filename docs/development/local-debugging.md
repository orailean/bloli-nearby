# Local debugging: Docker database, native app processes

For the current six-site setup and small mixed-category sample, start with [Bloli Nearby local development](multi-site.md). The regional workflows below remain available for source-level debugging.

Run only PostgreSQL/PostGIS in Docker. Run the Node API and Vite on your machine, where your IDE can set breakpoints normally. `compose.dev.yaml` is an independent database-only project named `bloli-nearby-dev`; it does not start the app, importer, shared Nginx, or any production service.

## 1. Start the development database

Requires Node >=22.12, Docker, and Docker Compose v2. Copy the development environment and start its database:

```bash
cp .env.local.example .env.local
# Optionally change DEV_DB_PASSWORD and the matching password in DATABASE_URL.
docker compose --env-file .env.local -f compose.dev.yaml up -d
docker compose --env-file .env.local -f compose.dev.yaml ps
npm ci
```

The default connection is `postgres://bloli_nearby_dev:bloli-dev-only@127.0.0.1:55432/bloli_nearby_dev`. That password is a local development example, not a production credential. Docker publishes the port on loopback only. `.env.local` is ignored by Git. If you change `DEV_DB_PORT`, update `DATABASE_URL` to match; percent-encode special password characters in the URL.

Changing the password environment variable does not change an existing PostgreSQL role in a persistent volume. Use SQL to change that role password or create a separate disposable development database; do not delete a volume containing data you want to keep.

The development volume is separate from the normal app's `bloli-nearby_postgres_data` volume. Stopping the dev database retains its data:

```bash
docker compose --env-file .env.local -f compose.dev.yaml stop
```

## 2. Run the API and frontend outside Docker

Terminal one, from the project root:

```bash
npm run dev:api
```

Terminal two:

```bash
npm run dev
```

Open <http://localhost:5173>. Vite proxies `/api` to the native API at `127.0.0.1:3100`. The API creates the schema on startup. Before a sample import, readiness correctly reports missing data rather than claiming that there are no toilets.

Do not run the full app Compose stack for this workflow. `compose.dev.yaml` supplies only its database. The existing production Nginx is unrelated to local debugging.

## 3. Attach an IDE debugger

Start the API with Node's inspector:

```bash
npm run debug:api
```

Attach an IDE Node.js remote-debug configuration to `localhost:9229` (JetBrains: **Attach to Node.js/Chrome**). Set breakpoints in `src/server/api.ts`, `repository.ts`, `import.ts`, or `src/shared/domain.ts`; source TypeScript is loaded by tsx. Use `--inspect-brk=127.0.0.1:9229` instead to pause before startup. Bind the inspector to localhost, not `0.0.0.0`.

For the frontend, use browser DevTools or the IDE's JavaScript debugger at `http://localhost:5173`. Vite serves source maps and hot updates. Backend changes restart the native API through Node watch mode. Changes to `.env.local` require restarting that process.

## 4. Optional small development datasets

Use an isolated local development database. A regional sample deliberately rejects searches outside its coverage. The local implementation was verified with Bremen; the UI's search placeholder remains München / 81243 as requested. Sample data is not downloaded on normal startup, and no sample download is needed to run the app's missing-data state.

### Reuse the existing Bremen sample

If `data/bremen.jsonl` was generated during local development and its metadata uses the Bremen coverage polygon:

```bash
node --env-file=.env.local --import tsx src/server/import-cli.ts data/bremen.jsonl
```

The minimum counts in `.env.local.example` are intentionally set to 1 for small development extracts. Keep production thresholds in `.env`, and never import a regional sample into the Germany production database.

To obtain a new Bremen sample, use Geofabrik's small regional PBF and its matching `.poly`, then run the same extractor used by the full importer. Python dependencies are only needed for extraction, not for debugging the API/frontend:

```bash
python3 -m venv .venv
.venv/bin/pip install -r importer/requirements.txt
mkdir -p data
curl --fail --location --output data/bremen.osm.pbf https://download.geofabrik.de/europe/germany/bremen-latest.osm.pbf
curl --fail --location --output data/bremen.poly https://download.geofabrik.de/europe/germany/bremen.poly
.venv/bin/python importer/extract.py data/bremen.osm.pbf data/bremen.poly --source https://download.geofabrik.de/europe/germany/bremen-latest.osm.pbf > data/bremen.jsonl.part
```

Only after the extractor exits successfully, rename and import:

```bash
mv data/bremen.jsonl.part data/bremen.jsonl
node --env-file=.env.local --import tsx src/server/import-cli.ts data/bremen.jsonl
```

### Optional München / 81243 sample (documented, not downloaded)

For a smaller local snapshot around western Munich, including 81243 and the city centre, a one-off bounded Overpass request avoids downloading all Bavaria. This is a manual development-data option; the runtime app and production refreshes do not use public Overpass. Respect shared-service capacity, retain the downloaded file for reuse, and do not schedule repeated sample queries. [Overpass public service policy](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html).

Prepare `data/munich.overpass` with:

```text
[out:xml][timeout:60][maxsize:67108864];
(
  nwr[amenity=toilets](48.12,11.40,48.19,11.59);
  nwr[toilets=yes](48.12,11.40,48.19,11.59);
  node[place](48.12,11.40,48.19,11.59);
  relation[boundary=postal_code][postal_code=81243](48.12,11.40,48.19,11.59);
);
(._;>>;);
out meta;
```

Download it once:

```bash
curl --fail --location --max-time 90 \
  --data-urlencode data@data/munich.overpass \
  --output data/munich.osm \
  https://overpass-api.de/api/interpreter
```

Convert using the existing extractor from the project root. The snippet preserves the source timestamp, rejects Overpass error responses, declares only the selected regional coverage, and writes a complete temporary output before replacing the sample:

```python
# Run with .venv/bin/python after installing importer/requirements.txt.
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, "importer")
from extract import extract

root = ET.parse("data/munich.osm").getroot()
if root.tag != "osm" or root.find("remark") is not None:
    raise RuntimeError("Overpass did not return a complete sample")
meta = root.find("meta")
if meta is None or not meta.get("osm_base"):
    raise RuntimeError("Sample has no source timestamp")
coverage = {
    "type": "MultiPolygon",
    "coordinates": [[[[11.40, 48.12], [11.59, 48.12],
                       [11.59, 48.19], [11.40, 48.19], [11.40, 48.12]]]],
}
partial = Path("data/munich.jsonl.part")
with partial.open("w") as output:
    extract("data/munich.osm", coverage, output,
            "https://overpass-api.de/api/interpreter (Munich development sample)",
            meta.get("osm_base"))
partial.replace("data/munich.jsonl")
```

Import into a fresh dev database (or a separate dev database for Munich):

```bash
node --env-file=.env.local --import tsx src/server/import-cli.ts data/munich.jsonl
```

The importer intentionally rejects a substantial count drop or timestamp regression when replacing an existing snapshot. If switching between Bremen and Munich samples, use separate development databases rather than weakening validation or replacing production data. This region is a sample, not complete Munich or Germany coverage. The optional Munich download/conversion was documented only and has not been executed or verified against live Overpass in this session.

## Tests use a different database

Integration tests truncate app tables. Set `TEST_DATABASE_URL` to a separate disposable PostGIS database, not your dev sample or production database. The browser suite's existing city fixtures use Bremen. Keep those fixtures separate from any optional Munich sample. See [README](../../README.md) and [verification](../verification/implementation.md).
