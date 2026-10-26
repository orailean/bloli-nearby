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
docker compose --env-file .env.local -f compose.dev.yaml exec -T db createdb -U loo_dev loo_sample
```

Set `.env.local`'s `DATABASE_URL` to `postgres://loo_dev:loo-dev-only@127.0.0.1:55432/loo_sample` (use your configured password/port), then:

```bash
npm run seed:sample
npm run dev:api # terminal 1; use npm run debug:api for inspector/breakpoints
npm run dev     # terminal 2
```

Open **http://loo.localhost:5173** and **http://kippe.localhost:5173**. Both use the same services/database. Choose München or Bremen to see clearly labelled sample records. These fixtures are synthetic development data, not a Germany directory. Seeding refuses production, remote databases and an already-published dataset.

If your OS does not resolve these names to loopback, add `127.0.0.1 loo.localhost kippe.localhost` to your local hosts file. Vite allows only the documented local hostnames and preserves Host when proxying `/api`. Bare localhost selects Loo; `http://localhost:5173/?site=kippe` is a development-only debugging override. Public hostnames determine the site in production; a `site` query override is rejected there.

Translation JSON is separate: `src/web/locales/common/{de,en,ro}.json` plus `src/web/sites/{loo,kippe}/locales/{de,en,ro}.json`. Shared search/map behavior lives in common components; site modules supply artwork, branding, filters and details. Vite hot reload and IDE breakpoints work for both sites.

## Tests

```bash
npm test
npm run build
npm exec playwright -- install chromium webkit
npm run test:e2e
.venv/bin/python -m unittest discover -s importer
```

Integration tests truncate app tables. Use a separate disposable PostGIS database such as `loo_integration` and set `TEST_DATABASE_URL` before `npm run test:integration`. The legacy browser suite can use the existing Bremen dataset; the multi-site suite uses small deterministic mocked API responses to test both actual local hostnames without loading public map tiles. Domain routing, combined publication, failure retention and category isolation are separately tested against real PostGIS.

For Docker preview, the production gateway intentionally accepts only the two public domain hosts. Test with a Host header, e.g. `curl -H 'Host: kippe.bloli.com' http://127.0.0.1:8088/`; use the native hostname workflow above for browser development.
