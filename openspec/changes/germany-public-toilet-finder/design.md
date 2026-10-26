## Context

This is a new browser application for finding public toilets throughout Germany. The owner approved hosting the app and toilet database using Docker Compose, with maps loaded directly from public OpenStreetMap tile servers and no paid API or subscription dependencies. The host has 8 CPUs, 29 GiB total RAM (18 GiB available), and 541 GB free disk at planning time, shared with other services. These figures establish feasibility, not a traffic capacity guarantee.

## Goals / Non-Goals

**Goals:** Find nearby publicly usable toilets quickly; distinguish free, paid, and unknown fees; offer an accessible modern mobile and desktop UI; serve toilet searches from local data and use public map tiles within their usage policy; preserve service through failed refreshes.

**Non-Goals:** Embedded Google Maps, guaranteed complete or live facility information, user accounts, reviews, community editing, offline downloads, global coverage, and in-app route calculation. Initial distance ordering uses straight-line distance, explicitly labeled, rather than claiming walking distance. Existing server, domain, bandwidth, and electricity costs remain the owner's responsibility.

## Decisions

### Approaches considered

1. Embedded Google Maps with OSM facility data: familiar map, but production billing conflicts with the zero paid API requirement.
2. Public OSM tiles with a local toilet database: reduces host storage and maintenance while preserving local fee-filtered searches. The owner selected this approach for the initial release, accepting external map availability and usage-policy limits.
3. Self-hosted regional vector tiles and a local toilet database: more setup and storage, with control over map serving. Retained as a future option if traffic or availability needs justify it.

### Proposed implementation defaults

These are author recommendations for review, rather than additional decisions already made by the owner: TypeScript, React/Vite for the UI, Leaflet for displaying raster map tiles, a Node.js search API, and PostgreSQL/PostGIS for spatial queries. Pin supported package and container versions during implementation after checking their current documentation. Avoid a full Germany geocoder and routing engine in the first version.

```text
Browser ──HTTPS── Reverse proxy
                     ├── Static frontend and bundled UI assets
                     └── Search API ── PostGIS ◀── Toilet/settlement import jobs
Browser ── viewport tile requests ── Public OSM tile servers
Browser ── user opens directions ── Google Maps
```

### Map delivery

Load standard raster tiles directly in the browser from https://tile.openstreetmap.org/{z}/{x}/{y}.png using a configurable tile URL, attribution, and provider zoom limits. Bundle the map library and UI assets locally. Keep visible linked © OpenStreetMap contributors attribution and use the actual browser Referer; use strict-origin-when-cross-origin rather than suppressing Referer. Let normal browser HTTP caching honor provider headers and do not force cache bypass, bulk download, prefetch regions, use offline tile packs, or place a tile-cache proxy in front of this service. Request only normal interactive viewport tiles. Publish an app contact/report-map-issue link and document policy compliance. Public tile service is best-effort, without an availability guarantee; monitor usage and errors and provide operator configuration to switch to an appropriately licensed alternative or future self-hosted tiles. Do not automatically fall back to an unapproved provider. A map failure leaves local toilet lists and town/postcode selection usable. Browser tile requests disclose the viewed map area and client IP to the external provider; explain this in the privacy notice. No Germany map archive, tile-serving container, or map-refresh job is required for the initial release.

### Toilet data and refreshes

Download Germany's OSM PBF extract from Geofabrik. Filter using osmium or an equivalent streaming tool; retain standalone amenity=toilets nodes, ways, and relations plus facilities with toilets=yes where toilets:access explicitly permits public use. Interpret namespaced tags for toilets inside venues. Exclude explicit private, prohibited, customer-only, and restricted-key-only facilities from initial public results. Retain standalone toilets with unspecified access but display that access is unconfirmed. Preserve source type/id, raw tags, coordinates, normalized fields, dataset timestamp, and import timestamp. Derive representative points for areas and relations without assuming every toilet is a node. Merge duplicate source identities; do not collapse distinct nearby facilities merely by proximity.

Normalize fee into free, paid, or unknown using explicit fee tags; conditional, donation-based, and ambiguous values remain unknown with raw details available. Display charge text only when provided. An absent fee never means free. Store opening hours as source text and do not claim current opening status in version one. Accessibility remains yes, no, limited, or unknown. Import into staging, validate counts and coordinates, and transactionally replace active data; failed or suspicious imports retain the last good dataset. Use a job lock and record versions, counts, durations, errors, and completion time. A parent process owns the database advisory lock across preparation and publication, records the job before downloading, and marks abandoned running jobs interrupted after acquiring the lock on a later run.

Proposed schedule: weekly toilet/settlement refresh, configurable by the owner. Map tiles are fetched on demand from the provider and have no local refresh schedule. Limit refresh resources and measure initial download size, peak memory, CPU, disk, and duration before enabling schedules. Preserve room for staging and rollback; do not run overlapping heavy jobs.

### Search and location selection

Provide GET /api/toilets with latitude, longitude, radius, fee (all/free/paid), and bounded result limit. Use PostGIS geography distance in metres with an index. Default to 2 km and up to 100 results; offer explicit expansion up to 50 km. Validate coordinate ranges, Germany service coverage, radius, enum, and limit; use a stable source-id tie breaker. Include truncation metadata so a capped result is not presented as exhaustive. Map and list share exactly the returned result set; a viewport change does not silently change the search origin. Provide a Search here action.

Request browser location only after a user action. On denial, timeout, unsupported geolocation, or outside-Germany position, allow map selection and local town/postcode lookup. Build a modest settlement/postcode index from the Germany source, rather than deploying a street-address geocoder; label the input accordingly and distinguish ambiguous matches with source region/postcode, a clearly labeled nearest-city context, or coordinates when geographic context is missing. Nearby-city context is an approximate aid, not an asserted administrative boundary. Coordinates are used transiently for requests and are not stored as location history or included in routine request logs.

### Product experience

The initial release supports German (`de`), English (`en`), and Romanian (`ro`) throughout the interface. Provide a visible language selector labeled Deutsch, English, and Română, without flag-only controls. Store an explicit choice locally and preserve it across reloads; storage failure must not prevent switching during the current session. Proposed initial selection: use a saved supported preference first, otherwise the first supported language in the browser preference list (matching regional variants such as de-DE, en-GB, and ro-RO), otherwise German. Set the document language when the locale changes. Bundle translation dictionaries locally, including accessible names, validation, API error messages, loading/empty/error states, filters, details, unknown values, and directions. Format distances, dates, and numeric prices using the active locale; preserve source charge text when it cannot be safely parsed. Keep API enum values and error codes stable and translate them in the UI. Check dictionary key parity so missing translations cannot silently ship.

Language changes preserve location, filters, result selection, and map position. Proper names, raw source opening hours, and free-text OSM notes remain as supplied; do not imply machine translation of external content. Prefer localized facility/settlement names when present in the local dataset, falling back to the source name. Public raster map labels are baked into the provider's tiles and do not change with the UI language. Language selection does not expand geographic coverage beyond Germany.

On mobile, a map with an accessible expandable results sheet; on desktop, list and map side by side. Use restrained colors, readable typography, visible focus, large touch controls, and fee labels in addition to color. Keep list selection and map marker selection synchronized. Filters are All, Free, Paid, translated into the selected language; unknown fees appear under All. Details show name or a localized neutral fallback, straight-line distance, fee, access, opening-hours text, accessibility, source, and dataset date. Loading, empty, error, and stale-data states remain usable. Tile failure leaves the result list available. Attribution stays visible outside overlays. Account for longer translated labels and Romanian diacritics at mobile widths.

Offer an external Google Maps walking-directions URL using the destination coordinates, api=1, and travelmode=walking. Let Google obtain the origin; do not attach the user's coordinates. This action needs internet access and uses a separate service. Local search and map use do not call Google.

### Local development and debugging

Use the separate `compose.dev.yaml` database-only project for PostGIS on loopback port 55432, with a dedicated persistent volume and `.env.local` settings. Run the API and Vite as native local processes (`npm run dev:api`, `npm run dev`); `npm run debug:api` exposes the inspector only on localhost:9229. Keep test databases separate because integration tests truncate app tables. The development guide documents optional regional samples. Local verification uses Bremen; the optional München/81243 download is documentation only and has not been executed.

### Deployment and operations

Compose includes frontend/proxy, API, PostGIS, and an opt-in toilet/settlement import/update job profile. Bind only the web endpoint publicly; keep database and internal services private. Use configurable HTTPS integration with the owner's reverse proxy, secrets outside version control, persistent named volumes or documented host mounts, health checks, restart policies, bounded API work, and per-service resource limits. Readiness distinguishes missing initial data from normal empty results. First installation requires an explicit bootstrap import; repeated starts do not redownload datasets. Updates use a one-shot Compose command invoked by the host scheduler. Provide backups and restore instructions for the database, configuration, and active dataset metadata. Map provider configuration must be documented; no map archives need backup.

## Risks / Trade-offs

- Missing or outdated OSM information → show unknown fields, source and dataset date; avoid claims of completeness or current availability.
- Disk or memory pressure on a shared host → benchmark imports, reserve staging space, set container limits and prevent overlapping imports; do not assume available memory is dedicated.
- Upstream download interruption → resume/retry where supported, retain active snapshots, and expose refresh failures.
- Public tile availability or usage restrictions → follow the tile policy, preserve independent search/list operation, and support an operator-selected replacement; no unlimited or guaranteed free map-service capacity is promised.
- External map privacy → describe third-party tile requests and keep user search history out of local routine logs.
- Browser geolocation needs a secure context → serve production over HTTPS and retain manual selection.
- Straight-line nearest toilet may be across a barrier → label distance clearly and delegate walking routes to Google Maps.
- Data licensing and mixed map assets → inventory source licenses and attribution; include the applicable ODbL notices and database-sharing obligations before release.

## Migration Plan

There is no existing app or database to migrate. Bootstrap on a local/staging Compose stack, inspect Germany coverage and real sample facilities, measure host impact, then configure the public HTTPS endpoint. Validate persistence across restarts and a failed refresh before release. Roll back application images and map provider configuration to previous working versions; restore the database backup if a schema migration cannot be reversed. Back up before migrations and document version compatibility.

### Inspected Contabo proxy integration

Read-only inspection on 2026-10-26 confirmed the owner's existing Docker container `nginx` owns public ports 80/443. Keep that proxy and its Compose deployment at `/home/oliver/stack/nginx/docker-compose.yml`. Deploy the app at `https://loo.bloli.com`, connecting only its gateway to the existing `nginx_default` network using alias `find-a-loo-web`. Do not install host Nginx or publish a competing proxy on these ports.

The existing `nginx_nginx_conf` named volume stores virtual hosts at `/etc/nginx/conf.d`. Host `/etc/letsencrypt` and `/var/lib/dehydrated/acme-challenges` are already mounted at identical container paths. Use host Snap Certbot with webroot validation, its existing renewal timer, and a domain-scoped deploy hook that tests/reloads Docker Nginx after renewal. Two renewal timers, a monthly cron invocation and unrelated existing renewal failures were observed; scheduler consolidation requires separate operational review. No host changes were made or authorized. See [the deployment guide](../../../docs/deployment/contabo-nginx.md) for complete bootstrap/final Nginx configuration, issuance, renewal tests, and rollback.

## Open Questions

No unanswered product decision blocks this proposal. The domain and existing proxy are now confirmed; before deployment, confirm the backup location and recheck current host/network state. Confirm real toilet dataset sizes, public map behavior, and resource limits through an implementation spike. The owner should review the proposed stack, browser-language selection with German fallback, manual town/postcode search scope, and refresh schedules before implementation.

## References

- https://wiki.openstreetmap.org/wiki/Tag:amenity%3Dtoilets
- https://www.geofabrik.de/data/download.html
- https://operations.osmfoundation.org/policies/tiles/
- https://developers.google.com/maps/documentation/urls/get-started
