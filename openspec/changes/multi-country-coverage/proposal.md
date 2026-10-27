## Status

**On hold — 2026-10-27, at the owner's request.** Retain these planning artifacts for later; do not start implementation or deployment until the owner explicitly resumes this change.

## Why

Bloli Nearby currently limits all three discovery sites to Germany. Extend the shared platform to Austria and Romania so people can find mapped toilets, tobacco sellers and Döner/kebab venues across all three countries without separate deployments.

## What Changes

- Configure DE, AT and RO as independently refreshable source regions, with country-specific validation, coverage, provenance and update status.
- Preserve other countries when one import fails or refreshes; deduplicate overlapping source objects near borders.
- Keep one PostGIS database and the existing shared web/API/importer services and domains: `loo.bloli.com`, `kippe.bloli.com` and `kebab.bloli.com`.
- Make location and settlement searches country-aware, including ambiguous names/postcodes, Romanian diacritics and nearby results across supported borders.
- Add an optional country selector for town/postcode search; geolocation and map selection continue to work across the combined coverage.
- Evaluate Open now using each place's local timezone and country/region holiday context, including Romania's timezone.
- Update separate DE/EN/RO copy, coverage messages, source-date display, samples, tests, refresh automation and deployment documentation.
- Preserve existing category inclusion rules, German language fallback, 0.5 km default and 0.5/1/2/3/5 km radii. Expanding food classification to shawarma is outside this proposal.

## Capabilities

### New Capabilities

- `multi-country-data`: Independent, validated country snapshots, shared identity reconciliation, coverage and source status for DE/AT/RO.
- `multi-country-discovery`: Country-aware settlement search, border discovery, local-time opening hours and multilingual coverage experience on all three sites.
- `multi-country-operations`: Configurable country refreshes, native development samples, migration, verification and documented rollback on the existing stack.

### Modified Capabilities

None in canonical `openspec/specs`; the completed Germany, multi-site and Kebab changes provide the existing implementation context.

## Impact

Touches source preparation/extraction, import staging/publication and database migrations, API status/search contracts, opening-hours evaluation, shared frontend/locales, test fixtures and operational scripts/docs. Existing database/login, Docker volume names, host routing, TLS certificates and service ports remain valid. No new permanent services, country domains, paid APIs or dataset binaries in Git. Production deployment belongs to the future implementation; this change currently contains planning artifacts only.
