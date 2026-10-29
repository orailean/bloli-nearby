## Why

Extend Bloli Nearby with focused cash-machine and accommodation finders, using the same free OSM sources and shared infrastructure. The owner has created `atm.bloli.com` and `stay.bloli.com`; both resolve to the existing Contabo server.

## What Changes

- Add ATM discovery for standalone machines and establishments explicitly mapped as having an ATM. Provide operator, mapped currencies, withdrawal/deposit services, access, mapped fees and opening hours without assuming every bank has an ATM or every machine is accessible 24/7.
- Add Stay discovery for hotels, motels, guesthouses, hostels, apartments, chalets/holiday homes, campsites and caravan/motorhome sites, with accommodation-type filters and mapped contact, website, stars and amenities. This broad accommodation scope is the proposed default pending owner review.
- Create two distinct responsive identities with headers, footers, separate DE/EN/RO/HU translations, German fallback, free icons and accessible motion, retaining the shared map/list interaction and 0.5/1/2/3/5 km radii (0.5 km default).
- Cover all four active countries: Germany, Romania, Austria and Hungary. Extend the shared import from six to eight categories with independently measured national floors and atomic country publication.
- Reuse verified retained national PBFs during the rollout, re-filter once per country for both new categories, and preserve all existing category data and fast settlement search.
- Extend existing Docker gateway/Nginx routing and certificate renewal to both domains. Keep one database, shared services and existing host ports; deploy approved work via `main` and record VM actions in the project protocol.
- Exclude live ATM cash status, personal bank/card fee estimates, live room inventory, booking/payment flows and current accommodation prices. Stay does not equate reception hours with room availability and does not offer an ambiguous Open now filter.

## Capabilities

### New Capabilities

- `atm-discovery`: ATM eligibility, services, fee/access/hours interpretation and scoped filters.
- `stay-discovery`: Accommodation eligibility/types, mapped details and availability semantics.
- `atm-stay-site-operations`: Distinct multilingual site experiences, eight-site routing, local samples and safe four-country import/deployment.

### Modified Capabilities

- `charge-discovery`: Extend complete shared publication from six to eight categories while preserving Charge results and filters.

## Impact

Touches category/site registries, shared types, schema constraints, extraction/normalization/publication/status logic, local fixtures, frontend site modules, host shells, proxy/TLS templates, refresh maintenance, checks and documentation. No paid service or new permanent container is needed. Both A records resolve to `173.212.194.159`; no AAAA answer was returned during this proposal check. Proposal creation does not change production.
