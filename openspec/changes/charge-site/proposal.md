## Why

EV drivers need nearby charging locations with useful connector, power and access information. Add Charge at the owner-created `charge.bloli.com` as a sixth focused Bloli Nearby site, using the existing shared Germany OSM source and infrastructure without a paid API.

## What Changes

- Add an electric-car charging profile/category, including public and customer-only locations with clear access labels; exclude private, inactive and bicycle-only charging.
- Offer connector, minimum mapped power, access and free/paid filters, plus mapped access-hours filtering clearly separated from connector availability.
- Show mapped operator/network, connector counts and power, fees, payment/authentication methods, capacity and access restrictions without inventing missing facts.
- Use station-level OSM locations for the initial release; avoid counting individual dispensers as additional stations.
- Add a distinct responsive charging identity, header/footer, separate DE/EN/RO content, German fallback and accessible, reduced-motion-aware animations. Preserve 0.5 km default and 0.5/1/2/3/5 km radii.
- Extend shared import/publication, native local samples, tests, host routing, TLS renewal and deployment documentation to six sites without new permanent containers, database or host ports.
- Keep live occupancy, fault status, reservations, charging sessions, exact current tariffs and vehicle-specific route planning outside this OSM-based release.

## Capabilities

### New Capabilities

- `charge-discovery`: Car-charger eligibility, connector/power/access normalization, combined filtering and safe six-category publication.
- `charge-site-experience`: Distinct multilingual Charge UI, charging details, honest availability wording and driving directions.
- `charge-site-operations`: Sixth-host routing, local samples/testing, retained-source preparation, HTTPS renewal and audited rollout.

### Modified Capabilities

None in canonical `openspec/specs`; completed site changes provide implementation context.

## Impact

Extends shared site/types/import registries, category constraints and discovery queries, adds a Charge frontend module/locales/artwork and updates shells, gateway/Nginx configuration, samples/tests and operator documentation. Retains one shared PostGIS database and the generic Bloli Nearby stack/volumes. The owner reports DNS created; verify actual A/AAAA answers during rollout. Germany only; Austria/Romania expansion remains on hold. This proposal authorizes no VM changes or deployment by itself.
