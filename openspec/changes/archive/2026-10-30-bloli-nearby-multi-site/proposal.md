## Why

The existing Germany OSM source can support several focused nearby-location sites without duplicating downloads, databases or deployment stacks. Bloli Nearby will preserve Find a Loo while adding a distinct cigarette purchase-location finder on kippe.bloli.com.

## What Changes

- Introduce Bloli Nearby as the umbrella project and rename the repository/package/descriptions to bloli-nearby; retain Find a Loo and Kippe as public site identities.
- Serve loo.bloli.com and kippe.bloli.com from one frontend/gateway, one API, one PostGIS database and one scheduled importer.
- Resolve explicit hostname-based site profiles, with separate branding, page metadata, theme assets, category controls and DE/EN/RO translation files.
- Extend extraction of the retained full Germany PBF to cigarette vending machines, tobacco shops and explicitly tagged tobacco-selling shops/petrol stations, and publish categorized location data with shared settlements and per-category readiness/validation.
- Give Kippe seller-type filters, mapped opening hours, payment/operator details and clear uncertainty about product availability; do not infer cigarette sales from a generic shop or petrol-station tag.
- Preserve the current WC site, including its 0.5-km default, 0.5/1/2/3/5-km options, fee/Open now filters, mobile layout and map/list interactions.
- Add native local multi-site debugging, small mixed-category fixtures and automated tests for both domains.
- Migrate production naming explicitly without detaching existing volumes, losing data or publishing additional host ports; add kippe HTTPS and renewal through existing Docker Nginx/Certbot integration.
- **BREAKING (internal):** deployment/repository names and generic location APIs replace WC-specific internal naming. Keep a compatibility route during transition and document operator commands.

## Capabilities

### New Capabilities

- `domain-site-profiles`: trusted hostname selection, distinct responsive site designs, metadata and translations over shared frontend components.
- `categorized-poi-discovery`: categorized OSM import, shared spatial discovery and category-appropriate filters with isolated dataset health.
- `multi-site-operations`: platform rename, safe deployment migration, local two-domain debugging, HTTPS, verification and rollback.

### Modified Capabilities

None in the main specification directory. The existing WC behavior in the completed germany-public-toilet-finder change is a regression baseline and remains required.

## Impact

Touches the frontend app shell, map/details/filters and i18n structure; API domain resolution and discovery routes; PostGIS schema/import publication; Python extraction; Compose, Vite, tests and operator documentation. Requires a GitHub repository rename, a kippe DNS record and a new domain certificate at deployment time. Reuses the existing downloaded Germany source where its checksum matches; raster map tiles continue to load directly from OSM. No paid APIs or extra per-domain application stacks are required.
