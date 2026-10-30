## Why

The owner wants the next nearby public-transport stop or station, including train, U-Bahn, S-Bahn, tram, bus, taxi and other passenger transport. Add `transit.bloli.com` to Bloli Nearby so one focused site can discover these mapped boarding locations using the existing shared Germany data and services.

## What Changes

- Add a host-bound Transit profile/category covering passenger rail, U-Bahn, S-Bahn, tram/light rail, bus/trolleybus, taxi ranks, ferries and cable/funicular/other mapped passenger rail stops.
- Add transport-mode filtering, multi-mode interchange badges, mapped station/platform/accessibility/network details and walking directions to suitable mapped access/boarding points.
- Reconcile legacy transport tags with public_transport station/platform/stop_area/route membership, group explicitly related station features and avoid duplicated platform/stopping-position results.
- Preserve missing/uncertain mode information without inventing S-Bahn service from a station name or light-rail tag alone.
- Give Transit an original wayfinding-inspired identity with separate DE/EN/RO, responsive header/footer and restrained train/route motion; retain German fallback and 0.5/1/2/3/5 km radii with 0.5 km default.
- Share existing containers/database/volumes and extend validated publication, local samples/tests, HTTPS renewal and operator documentation to five sites.
- Show mapped access hours as details; do not offer a misleading Open now service filter. Live departures, delays, vehicle availability, fares and journey planning require separate service data and are outside this first version.

## Capabilities

### New Capabilities

- `transit-discovery`: Passenger stop classification, mode evidence, grouping, filtering, usable map/directions targets and safe five-category publication.
- `transit-site-experience`: Distinct accessible multilingual Transit presentation, multi-mode controls and mapped service details.
- `transit-site-operations`: Fifth-host routing, native local workflow, synthetic fixtures, tests, source reuse, TLS and documented production rollout.

### Modified Capabilities

None in canonical `openspec/specs`; previous completed changes supply the shared implementation context.

## Impact

Touches import relation context/geometry, transit normalization/types and database queries, additive category checks, capability-aware API/UI filters, frontend site module/locales/theme, HTML shell/gateway routing, samples/tests and operations docs. One PostGIS database and the generic Bloli Nearby resources remain. Domain is owner-confirmed and DNS A currently resolves to `173.212.194.159` with no AAAA answer. Initial scope remains Germany; Austria/Romania expansion is still on hold.
