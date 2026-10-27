## Why

Bloli Nearby already provides nearby discovery for toilets and tobacco sellers across Germany. The owner wants a third, distinct site at `kebab.bloli.com` for mapped Döner/kebab places, reusing the existing source download, database and services.

## What Changes

- Add an explicitly host-bound Kebab profile and `kebab` location category, including native development at `kebab.localhost:5173`.
- Extract fixed restaurants and fast-food venues with mapped kebab/Döner cuisine, including semicolon-separated cuisine values; preserve explicit exclusions and source provenance.
- Extend the combined importer and category validation to three categories, retaining atomic publication, old-data retention on failure, and shared settlement/source consistency.
- Add a distinctive takeaway-counter design with its own artwork, favicon, metadata and separate DE/EN/RO content. Preserve the shared map/list, directions, German fallback, 0.5 km default, 0.5/1/2/3/5 km choices and Open now.
- Show mapped hours and useful venue details without inventing prices, ratings, stock, halal status or 24/7 opening.
- Add the domain to existing Docker Nginx routing, issue Let's Encrypt TLS with automatic renewal, and include all three sites in verification and the deployment protocol. No extra permanent app containers or published host ports.

## Capabilities

### New Capabilities

- `kebab-discovery`: Categorized kebab data, normalization, filtering, source provenance and safe publication alongside the existing categories.
- `kebab-site-experience`: A distinct, responsive, multilingual Kebab identity using the existing discovery interactions.
- `kebab-site-operations`: Three-host routing, local samples/tests, shared production deployment, TLS renewal and operator documentation.

### Modified Capabilities

None in canonical `openspec/specs`; completed earlier changes remain the implementation context.

## Impact

Touches shared profiles/types, additive database constraints, importer/extraction, category-aware API validation, frontend site modules/locales, shell generation, Nginx configuration, samples/tests and operational documentation. Existing production data volumes, database/login, Compose identity and refresh/backup schedules remain bound to their current resources. The owner confirmed the domain and mapped Döner/kebab scope; DNS and the proposed visual direction still need to be settled before public rollout.
