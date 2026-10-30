## Why

The owner selected a drinking-water finder as the next Bloli Nearby site and created DNS for `water.bloli.com`. Extend the shared Germany platform to help people find mapped potable-water points and bottle-refill partners with a distinct Water identity.

## What Changes

- Add a host-bound Water profile and `water` category alongside toilets, tobacco and kebab, sharing the existing database, services and retained Germany source.
- Extract explicitly mapped drinking-water points and refill establishments; exclude explicit non-potable, restricted and inactive sources without inferring drinkability from an ordinary fountain, spring or tap.
- Add separate DE/EN/RO Water copy, original bottle/tap artwork, favicon and initial metadata with a white/cobalt visual identity and action-triggered ripple motion.
- Reuse free/paid/unknown fee handling, mapped Open now, 0.5 km default, 0.5/1/2/3/5 km radii, search, directions and accessible responsive map/list behavior.
- Extend validated atomic publication, local samples, tests, existing Docker Nginx routing and Let's Encrypt renewal to the fourth site; document actual deployment steps.

## Capabilities

### New Capabilities

- `water-discovery`: Conservative mapped-water classification, data normalization and safe four-category publication.
- `water-site-experience`: Distinct multilingual Water identity and mapped water details using shared discovery behavior.
- `water-site-operations`: Host routing, native development, samples, TLS, production verification and deployment protocol.

### Modified Capabilities

None in canonical `openspec/specs`; existing completed changes provide the implementation context.

## Impact

Touches the shared site/category registry, additive category schema constraints, importer, Water normalization/types, frontend modules/locales/theme, shell generation, proxies, tests and docs. Existing generic Docker volumes, database/login, service ports and shared infrastructure remain in use. No paid services, dataset binaries, new permanent containers or country expansion. The Austria/Romania proposal remains on hold.
