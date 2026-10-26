## 1. Validate data and deployment assumptions

- [x] 1.1 Verify the proposed stack's supported versions, container images, Leaflet raster tile integration, licenses, and public OSM tile usage policy compliance.
- [x] 1.2 Trial representative Germany toilet extraction; record disk use, peak memory, CPU and duration, and check public tile display and facility coverage including borders and islands.
- [x] 1.3 Choose initial resource limits, staging disk headroom, and import validation thresholds from measurements; document manual recovery if limits are exceeded.

## 2. Establish the application and Compose services

- [x] 2.1 Scaffold the TypeScript frontend and API with pinned dependencies and production container builds.
- [x] 2.2 Configure PostGIS schema migrations, facility/provenance fields, spatial indexes, settlement/postcode lookup, and import job metadata.
- [x] 2.3 Add full-stack Compose services and a separate database-only development Compose file for native API/frontend debugging, with private networking, persistent volumes, health/readiness checks, secrets configuration and resource limits.

## 3. Import Germany facilities and configure public maps

- [x] 3.1 Implement repeatable Germany PBF download and streaming extraction for toilet nodes, ways, relations and public venue toilets, with representative coordinates.
- [x] 3.2 Implement fee/access/accessibility normalization, raw-tag preservation and exclusion of explicitly restricted facilities.
- [x] 3.3 Add staged validation, job locking, atomic publication, failure reporting, and source-identity deduplication.
- [x] 3.4 Build a local town/postcode lookup with disambiguating region metadata.
- [x] 3.5 Configure direct browser OSM raster tile loading, configurable provider URL/attribution/zoom limits, caching and Referer compliance, visible attribution/contact links, and tile failure recovery; exclude bulk/offline downloads and a tile proxy.

## 4. Implement discovery APIs

- [x] 4.1 Add validated spatial search with default 2 km radius, explicit expansion up to 50 km, bounded results, stable distance ordering, and truncation metadata.
- [x] 4.2 Add All/Free/Paid filtering and facility detail fields with conservative unknown states.
- [x] 4.3 Add local settlement/postcode lookup and dataset readiness/freshness metadata; avoid routine coordinate logging and location history.

## 5. Build the responsive experience

- [x] 5.1 Build a responsive map/list shell with accessible controls, attribution, and synchronized selection.
- [x] 5.2 Add user-initiated location access, manual map origin selection, Search here, and town/postcode search with recovery from denied or outside-coverage positions.
- [x] 5.3 Add fee filters, distance labels, details, and explicit unknown price/access/hours/accessibility states.
- [x] 5.4 Add loading, empty, error, stale-data, missing-bootstrap, and tile-failure states with a usable independent list.
- [x] 5.5 Add Google Maps walking-directions URLs using only destination coordinates, with no Google SDK or API key.
- [x] 5.6 Add complete local German, English, and Romanian dictionaries, browser-language detection with German fallback, a persistent language selector, document-language updates, and locale-aware formatting without resetting search/map state.

## 6. Verify requirements and operate the deployment

- [x] 6.1 Verify normalization and import fixtures including conditional fees, namespaced tags, restricted access, areas/relations, repeat imports and interrupted refreshes.
- [x] 6.2 Verify API spatial ordering, filter correctness, invalid inputs, boundaries, empty results, radius expansion and result truncation against a seeded database.
- [x] 6.3 Verify mobile and desktop flows, keyboard access, geolocation denial, map/list synchronization, directions URLs and degraded states in browser checks.
- [x] 6.4 Smoke-test Compose bootstrap/restart persistence, missing-data readiness, local searches with external tile requests blocked, resource limits, failed data refresh and map-provider configuration rollback.
- [x] 6.5 Document bootstrap, configurable weekly toilet/settlement update commands, scheduler locking, HTTPS integration, configuration, licenses, backups, restore and rollback; perform a restore rehearsal.
- [x] 6.6 Prepare docs/deployment/contabo-nginx.md and ready-to-copy deploy/nginx and deploy/letsencrypt files for loo.bloli.com, retaining existing Docker Nginx and documenting network integration, webroot issuance, Snap renewal and Docker reload verification. Actual host changes and certificate issuance remain outside the authorized documentation/local implementation scope.
- [ ] 6.7 Before authorized deployment, recheck proxy/network/shared resource usage and backup location, then confirm measured limits fit alongside existing services. Review duplicate Certbot schedulers and unrelated renewal failures separately.
- [x] 6.8 Verify translation key parity, all three locales including error/unknown states and accessible labels, regional browser preferences, persistence/storage failure, localized formatting, Romanian diacritics, and mobile layouts with longer labels.
