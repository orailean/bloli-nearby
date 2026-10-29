## Status

**On hold — 2026-10-27, at the owner's request.** Planning only; do not implement or deploy until the owner explicitly resumes this change.

## Why

Bloli Nearby currently serves six discovery sites from Germany data only. Expand the shared platform to Romania first, then Austria and Hungary after Romania passes production validation. This brings a connected Germany–Austria–Hungary–Romania region onto the existing shared platform without separate deployments.

## What Changes

- Extend country-aware source, storage, coverage and status handling for DE, RO, AT and HU. Germany remains active throughout; Romania is the first foreign country activated.
- After Romania passes the defined data, search, timezone, operations and browser checks, publish Austria and Hungary separately, one country at a time.
- Preserve each country's last good snapshot when a new import or refresh fails; reconcile shared OSM identities and extract boundary overlaps.
- Keep one PostGIS database and the existing shared web/API/importer services and six domains: `loo.bloli.com`, `kippe.bloli.com`, `kebab.bloli.com`, `water.bloli.com`, `transit.bloli.com` and `charge.bloli.com`.
- Make location and settlement searches country-aware, including ambiguous names/postcodes, Romanian diacritics and nearby results across active supported borders.
- Add an optional country selector for town/postcode search; geolocation and map selection continue to work across combined active coverage.
- Evaluate Open now using each place's local timezone and country/region holiday context: Germany (`Europe/Berlin`), Romania (`Europe/Bucharest`), Austria (`Europe/Vienna`) and Hungary (`Europe/Budapest`).
- Keep separate DE/EN/RO translation files, German fallback, current site identities and features, coverage messages, country source dates, samples, tests, refresh automation and deployment documentation. Hungarian UI translation is outside this change.
- Preserve existing category inclusion rules, 0.5 km default and 0.5/1/2/3/5 km radii. Expanding food classification to shawarma is outside this proposal.

## Activation Plan

1. Deploy the country-aware schema and code with Germany preserved; import Romania as the first new country.
2. Validate Romania's six category datasets and settlements, data floors, source/boundary provenance, Bucharest timezone/holiday behavior, all six site searches and responsive DE/EN/RO experiences. Confirm normal Germany operation and refresh remain unchanged.
3. Only after that gate passes, import Austria and then Hungary as separate country publications with independent rollback and verification. A failure in one country must not prevent or roll back other active countries.

The country registry and fixtures cover all four countries from the start, while production data activation is gated as above. Imports run sequentially; no full-country extraction runs concurrently.

## Capabilities

### New Capabilities

- `multi-country-data`: Independent validated snapshots, shared identity reconciliation, coverage and source status for DE/RO/AT/HU, with Romania first and Austria/Hungary gated after it passes.
- `multi-country-discovery`: Country-aware settlement search, border discovery, local-time opening hours and multilingual coverage experience across all six sites.
- `multi-country-operations`: Configurable per-country refresh, staged activation, native development samples, verification and documented rollback on the existing stack.

### Modified Capabilities

None in canonical `openspec/specs`; the completed Germany, multi-site and category-specific changes provide the existing implementation context.

## Impact

Touches source preparation/extraction, import staging/publication and database migrations, API status/search contracts, opening-hours evaluation, shared frontend/locales, test fixtures and operational scripts/docs. Existing database/login, Docker volume names, host routing, TLS certificates and service ports remain valid. No new permanent services, country domains, paid APIs or dataset binaries in Git. The proposal remains on hold; production deployment belongs to a future explicitly resumed implementation.
