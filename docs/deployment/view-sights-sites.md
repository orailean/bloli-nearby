# View and Sights

View (`view.bloli.com`) finds mapped viewpoints and observation towers. Sights (`sights.bloli.com`) finds mapped museums, attractions, castles, ruins, monuments, memorials and archaeological sites. Both use the existing frontend/API/PostGIS deployment, country-aware snapshots and four locales (German, English, Romanian and Hungarian).

## Classification and visitor details

View accepts `tourism=viewpoint` or the combination `man_made=tower` and `tower:type=observation`. Observation towers take the `tower` type even when also tagged as viewpoints; one source creates one View result. Peaks, communication towers and watchtowers are not inferred to be viewpoints. See [OSM viewpoints](https://wiki.openstreetmap.org/wiki/Tag:tourism%3Dviewpoint).

Sights accepts `tourism=museum|attraction` or `historic=castle|ruins|monument|memorial|archaeological_site`. Historic classifications take precedence over generic tourism labels. Ruins remain valid destinations, including `ruins=yes`; explicit inactive, removed, demolished, proposed or construction features are excluded. Names alone, generic historic buildings and accommodation do not qualify. See [OSM tourism](https://wiki.openstreetmap.org/wiki/Key:tourism) and [historic features](https://wiki.openstreetmap.org/wiki/Key:historic).

Private, forbidden, locked and conditional-access locations are excluded. Public/customer/unknown access and wheelchair information remain labelled. Unknown fees and hours remain unknown, and conditional fees do not become a confirmed free/paid result. Open now uses mapped hours, never an assumed 24/7 schedule. Website links accept HTTP(S) only. Phone, elevation, structure height and view direction are shown only when mapped; raw source values are retained.

Both sites open walking directions. The displayed nearby distance is straight-line distance. View's detail panel explains that terrain, elevation gain and walking routes can extend the journey. These sites do not supply hiking route suitability, live access, current weather, ticket availability or a booking service.

## Native development

Use [the shared local development guide](../development/multi-site.md). The new hostnames are:

- `http://view.localhost:5173`
- `http://sights.localhost:5173`

The existing localhost debugging override also accepts `?site=view` or `?site=sights`. Public hosts determine the site in production. Add the native names to your hosts file only if your operating system does not resolve `.localhost` automatically.

The guarded seed now contains all ten categories in all four countries, including two synthetic View locations and seven synthetic Sights locations per country. It requires a fresh, loopback-only database and refuses to overwrite existing country snapshots. Continue to use the Docker-only PostGIS/native Node/Vite workflow. The data is a development fixture, not a real tourist directory.

Category-specific types live in `src/shared/tourism-types.ts`; normalizers in `src/shared/tourism.ts`; shared tourist filters/details in `src/web/sites/tourism.tsx`; independent artwork and locales under `src/web/sites/view` and `src/web/sites/sights`.

## API and imports

`/api/locations` accepts the shared coordinates/radius/limit plus `fee=all|free|paid` and `openNow=true|false`. Additional filters are:

- View: `viewType=all|viewpoint|tower`.
- Sights: `sightType=all|museum|attraction|castle|ruins|monument|memorial|archaeological_site`.

Duplicate type filters, invalid types and cross-category filters return `INVALID_QUERY`. SQL applies type and fee filters before the result limit. Unknown hours are excluded by Open now. `/api/status` and `/api/ready` remain scoped to the request hostname, with country-specific counts and refresh outcomes.

The extractor emits ten-category metadata and records with kind `view` or `sights`, reconstructs node/way/relation geometry and aborts publication on missing fixed geometry. The expanded source-filter expression invalidates the existing filtered-PBF cache without discarding the retained source snapshot. Countries continue to use independent source/coverage provenance.

Existing complete eight-category non-German snapshots remain importable during rollout. Once either new category is published for a country, subsequent imports must include it, using the existing active-category omission guard. New country activation still requires all ten verified categories. Germany retains its historical partial-category bootstrap behavior. Publication is atomic; suspicious count drops or failed imports preserve the previous active snapshot.

New category floors have no unmeasured production default. Measure each country's new output using the existing `--measure-only` import workflow, review counts/access exclusions and set:

```text
MIN_DE_VIEWPOINTS=...
MIN_DE_SIGHTS=...
MIN_RO_VIEWPOINTS=...
MIN_RO_SIGHTS=...
MIN_AT_VIEWPOINTS=...
MIN_AT_SIGHTS=...
MIN_HU_VIEWPOINTS=...
MIN_HU_SIGHTS=...
```

All eight variables are forwarded to the importer by `compose.yaml`. Do not set these to sample values on production. The sample seeder sets its own floors to one for its fresh local database.

## Production rollout

Implementation prepares code and Nginx templates; it does not create DNS, certificates or import live data.

1. Back up and record the current revision using [production updates](production-updates.md). Keep the current working source/data volumes.
2. Configure measured per-country floors. Rebuild `api`, `web` and `importer`, then update `api` and `web` with the existing production Compose configuration. The API applies idempotent schema expansion; existing category rows remain intact.
3. Prepare and publish all ten categories for each active country. Check logs and country-specific readiness before exposing the new public sites. New sites return data-not-ready until a snapshot exists.
4. Add the two DNS hostnames. Bootstrap TLS using the existing [HTTPS procedure](contabo-nginx.md) and the dedicated `deploy/nginx/{view,sights}.bloli.com.{http,https}.conf` templates. Update only these dedicated virtual hosts, validate the shared proxy and reload gracefully. Include both lineages in renewal checks.
5. Check HTTPS shells, titles, canonical URLs, favicon, `/api/site`, readiness, search/type/fee/Open now filters and real map tile loads. Run `SITES=view,sights node scripts/check-multi-site-production.mjs` once their snapshots are ready. During staged rollout, limit `SITES` to already-published sites; the script's default now covers all ten.

View has its assigned analytics token `66e9fa7dd6aa48dea133dfb9a1611a12`. Sights has no assigned token and omits the beacon. All eight existing mappings remain intact; see [analytics configuration](web-analytics.md).

After publishing new categories, rollback must retain a compatible importer/schema or restore the corresponding pre-rollout backup. An older eight-category importer will be rejected if it omits an already-active View/Sights category.

## Verification

```bash
npm test
npm run build
.venv/bin/python -m unittest discover -s importer
# Set TEST_DATABASE_URL to a disposable PostGIS database; integration tests truncate it.
npm run test:integration
npm exec playwright -- test tests/e2e/multi-site.spec.ts
```

The new checks cover explicit tags, tower/historic precedence, access/lifecycle exclusion, unknown/conditional values, unsafe links, geometry failures, valid synthetic source identities, query isolation, SQL filtering before the cap, failed publication retention, ten-category country activation, all four languages and 320/390/430/1440px browser layouts. Analytics checks verify View's token and the absence of a Sights beacon pending configuration.
