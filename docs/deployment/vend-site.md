# Vend

`vend.bloli.com` finds explicitly mapped `amenity=vending_machine` objects using the shared finder, API and PostGIS deployment. It supports Germany, Romania, Austria and Hungary and English, German, Romanian and Hungarian. Local development: `http://vend.localhost:5173` or `http://localhost:5173/?site=vend`.

## Products and availability

The semicolon-separated `vending` tag is normalized into unique products. Filters cover drinks, snacks, food, coffee, milk, eggs, bread, ice cream, cigarettes, tickets, other products and unknown products. Explicit aliases such as `water` → drinks and `pizza` → food are grouped; original product values remain visible in details. Machines with missing product tags stay searchable. Tobacco machines can independently qualify for Kippe; their source identity is shared, but category-specific hours and details remain independent.

Payment filters require explicit `payment:* = yes`. Cash includes coins/notes; card includes supported card-network and credit/debit tags. Explicit negative parent tags and conditional payment information prevent confirmation. Unmapped payment details remain unknown. Public access requires mapped public/permissive/designated access; unknown and customer-only access remain available through the default filter. Private, forbidden, locked, conditional-access and inactive machines are excluded by normalization.

Open now uses mapped hours and the existing country-aware evaluation; unknown hours are excluded. Vend never inherits Kippe's assumed 24/7 machine hours. Products, stock, prices and working condition are not live. Directions use walking mode.

## API

`/api/locations` accepts shared coordinates, radius, limit and `openNow`, plus:

- `product=all|drinks|snacks|food|coffee|milk|eggs|bread|ice_cream|cigarettes|tickets|other|unknown`
- `payment=all|cash|card`
- `vendAccess=all|public`

Invalid, duplicate and cross-category filters return `INVALID_QUERY`. SQL applies these filters before the result limit. Hostname-scoped status and readiness report category-specific country coverage.

## Import and rollout

The extractor includes `nwr/amenity=vending_machine`, including machines without a `vending` tag. Nodes, ways and supported physical relations use the existing geometry pipeline. Missing required geometry aborts preparation. The new filter expression invalidates the filtered PBF cache while retained country source files can be reused.

Publication requires measured `MIN_{DE,RO,AT,HU}_VENDING_MACHINES` floors. There are no unmeasured production defaults for the new category. Previous complete snapshots remain importable before rollout; once Vend is active, omission is rejected by the active-category guard. New country activation requires all eleven categories. The guarded local sample supplies three vending examples per country and sets its own floors in a fresh development database.

Production sequence:

1. Run unit, extractor, PostGIS, build and responsive browser checks. Push the implementation to main for the existing GHCR pipeline. Keep the ten already-live sites in release gates during this initial deployment.
2. Add the dedicated Vend HTTP challenge host, obtain its certificate using the existing Certbot account/webroot, install the HTTPS template and reload the shared Nginx only after configuration validation. Extend the scoped renewal hook.
3. Acquire the shared operation lock; pause the weekly refresh timer and preserve its prior state. Record a database backup, private configuration recovery files and all existing country/category membership counts/fingerprints.
4. For each country, measure with `USE_RETAINED_SOURCE=1` and `MEASURE_ONLY=1`. Require unchanged original counts; set the vending floor to 80% of the measured eligible count, rounded up. Hash the JSONL and publish that exact file without another extraction. Verify its hash and every original category's count and identity fingerprint afterward.
5. Verify Vend HTTPS/API/search/filter behavior and all four countries, run `SITES=vend node scripts/check-multi-site-production.mjs`, then extend the permanent host and browser release gates to all eleven sites. Install the updated stable deployment helper under `.deploy/bin` and release the gate change through main.
6. Verify the replacement database backup before pruning older generated dumps; restore the refresh timer. Record release SHAs, import counts/floors, certificate checks and evidence locations in the rollout protocol.

Vend has no assigned Cloudflare analytics token yet. Its shell omits the beacon until a dedicated token is supplied; existing site tokens are unchanged.
