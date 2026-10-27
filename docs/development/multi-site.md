# Local development for Bloli Nearby

Run one native API/Vite pair and one Docker PostGIS database. Node >=22.12 and Docker Compose are required. No app containers or Germany download are needed for the small sample.

```bash
npm ci
cp .env.local.example .env.local # only when it does not already exist
# Review .env.local; these are local development credentials only.
docker compose --env-file .env.local -f compose.dev.yaml up -d --wait
```

Existing development data is preserved. For a fresh mixed-category sample, create a separate database in that same development DB container:

```bash
docker compose --env-file .env.local -f compose.dev.yaml exec -T db createdb -U bloli_dev bloli_nearby_sample
```

Set `.env.local`'s `DATABASE_URL` to `postgres://bloli_nearby_dev:bloli-dev-only@127.0.0.1:55432/bloli_nearby_sample` (use your configured password/port), then:

```bash
npm run seed:sample
npm run dev:api # terminal 1; use npm run debug:api for inspector/breakpoints
npm run dev     # terminal 2
```

Open **http://loo.localhost:5173**, **http://kippe.localhost:5173** and **http://kebab.localhost:5173**. All three use the same services/database. Choose München or Bremen to see clearly labelled sample records. These fixtures are synthetic development data, not a Germany directory. Seeding refuses production, remote databases and an already-published dataset.

If your OS does not resolve these names to loopback, add `127.0.0.1 loo.localhost kippe.localhost kebab.localhost` to your local hosts file. Vite allows only the documented local hostnames and preserves Host when proxying `/api`. Bare localhost selects Loo; `http://localhost:5173/?site=kippe` is a development-only debugging override (`?site=kebab` selects Kebab). Public hostnames determine the site in production; a `site` query override is rejected there.

Translation JSON is separate: `src/web/locales/common/{de,en,ro}.json` plus `src/web/sites/{loo,kippe,kebab}/locales/{de,en,ro}.json`. Shared search/map behavior lives in common components; site modules supply artwork, branding, filters and details. Vite hot reload and IDE breakpoints work for all three sites.

## Tests

```bash
npm test
npm run build
npm exec playwright -- install chromium webkit
npm run test:e2e
.venv/bin/python -m unittest discover -s importer
```

Integration tests truncate app tables. Use a separate disposable PostGIS database such as `bloli_nearby_integration` and set `TEST_DATABASE_URL` before `npm run test:integration`. The legacy browser suite can use the existing Bremen dataset; the multi-site suite uses small deterministic mocked API responses to test all three actual local hostnames without loading public map tiles. Domain routing, combined publication, failure retention and category isolation are separately tested against real PostGIS.

For Docker preview, the production gateway intentionally accepts only the three public domain hosts. Test with a Host header, e.g. `curl -H 'Host: kippe.bloli.com' http://127.0.0.1:8088/`; use the native hostname workflow above for browser development.

## Existing local installation renamed on 2026-10-26

The development database/login were renamed to `bloli_nearby_dev` / `bloli_dev`, preserving the existing password and 246-toilet Bremen sample. The integration database is `bloli_nearby_integration`. The stopped old PostgreSQL volume was copied with ownership preserved into `bloli-nearby-dev-postgres-data`, and the new `bloli-nearby-dev-db-1` container was started on the same loopback port. The old development volume remains as a rollback copy; do not run both copies on the same port. The ignored `.env.local` was updated without changing its password. Fresh installations use the example password shown above.

The synthetic three-category fixture contains 6 toilets, 8 tobacco sellers, 8 kebab venues and 2 settlements. Integration imports use the disposable `bloli_nearby_integration` database and never the saved development sample. Once a database has all three categories active, imports omitting an active category are rejected; use a new local database when trying historical one/two-category samples.
