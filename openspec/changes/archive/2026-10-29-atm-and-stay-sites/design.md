## Context

Bloli Nearby serves six host-selected React identities from one Docker web/API/PostGIS stack. DE, RO, AT and HU are active with independent snapshots, overlap memberships, timezone-aware hours and country caches at `/data/countries/{de,ro,at,hu}`. The owner created `atm.bloli.com` and `stay.bloli.com`; A records were verified against `173.212.194.159`, with no AAAA response. Work is integrated and deployed through `main`.

## Goals / Non-Goals

**Goals:** Two useful focused finders, all four countries, independent subject filters/designs, separate DE/EN/RO/HU content, fast place search, retained source reuse and safe eight-category national snapshots.

**Non-Goals:** Live cash availability, bank-card fee calculations, room availability/prices, reservations, payments, reviews, additional countries or new permanent services.

## Decisions

### Approaches and shared architecture

Use the existing site/category registry, shared database and host routing. Separate databases/stacks would duplicate imports and operations; a generic all-categories portal would lose the focused site identities the owner wants. Add site/category `atm` and site `stay` with category `accommodation`. This extends the approach already proposed to the owner when the domains were selected. Keep new frontend behavior in site modules rather than adding more subject conditionals to shared App components.

### ATM eligibility and details

Accept active `amenity=atm` and fixed establishments with `atm=yes`. A bank without ATM evidence is not a cash-machine result. `atm=separate` means the establishment is not a second machine result. Retain source identity and representative geometry; distinguish an ATM mapped at establishment level from a precise machine point. Do not merge distinct nearby machines by distance.

Exclude explicitly unavailable withdrawals, access=no/private, prohibited or inactive features and unevaluable conditional restrictions. Retain customer-only access with a clear access label. Normalize mapped operator/network, currency codes, withdrawal/deposit services, wheelchair, access and hours; parent establishment metadata must not be relabelled as a known ATM bank/operator. Unknown properties stay unknown. For establishments use ATM-specific properties first; unrelated host fees are not machine-fee evidence. Display explicit mapped withdrawal-machine fees without promising the visitor's card issuer will charge nothing. Open now evaluates mapped access hours in the physical country's timezone; missing hours do not mean 24/7.

Filters: all/explicit mapped free/paid/unknown fee states, mapped currency (All default), deposit capability (All/Yes; unknown excluded only when requested) and Open now. Machine fees are mapped information, not personalized advice. Walking directions follow the existing nearby-finder default.

Sources: [ATM](https://wiki.openstreetmap.org/wiki/Tag:amenity=atm), [ATM inside an establishment](https://wiki.openstreetmap.org/wiki/Tag:atm=yes). Verify field-specific namespaces against documented source tags during implementation, particularly embedded-ATM fees/hours.

### Stay scope and semantics

Proposed scope: active `tourism=hotel,motel,guest_house,hostel,apartment,chalet,camp_site,caravan_site`. Display these as hotels, motels, guesthouses, hostels, apartments, holiday homes, campsites and motorhome/caravan sites. Include bookable customer access; exclude explicit private/no access, inactive sites, individual camping pitches, generic residential buildings and attractions without accommodation evidence. Alpine/wilderness huts are outside this initial scope. Do not infer category from names or websites.

Offer a type selector with All default; type filtering precedes ordering/limit. Show mapped contact/website, operator, address, stars, rooms/capacity and selected amenities when present. Stars are mapped classification, never review scores. Validate external HTTP(S) URLs and render source strings as text. Reception hours and check-in/out are separate detail fields. There is no Open now or free/paid accommodation filter: neither predicts a room for tonight. Show a concise availability note and direct contact/website actions. Proposed directions default is driving, suitable for reaching accommodation.

Sources: [Tourism types](https://wiki.openstreetmap.org/wiki/Key:tourism), [reception hours](https://wiki.openstreetmap.org/wiki/Key:opening_hours:reception).

### Distinct visual identities

ATM: a precise cash-slip / banknote direction, ink navy and mint, compact currency details and restrained receipt-feed motion. Stay: a warm travel-journal direction, cream/terracotta/dusk blue, luggage-tag result numbers and postcard-like illustrations. Both retain family typography/navigation patterns, useful headers/footers and map/list behavior; they are not simple recolors. Use the project frontend-design skill at implementation, existing free Lucide icons and code-native artwork. Keep animations brief, decorative and reduced-motion-aware. Fit 320/390/430 px devices without horizontal overflow. Translations stay in separate site JSON files with shared common keys and German fallback.

### Eight-category data and performance

Extend all category-dependent registries, schema checks, completion declarations, per-country floors, import counts, activation/readiness checks, geometry preflight and tests from six to eight using the category registry where possible. Existing six datasets remain readable during migration. Each new category is unready until its country's verified snapshot exists; do not remove current countries from existing sites because a new category is pending. Do not expose the two new public finders until all four national snapshots pass.

Refilter both new categories together from each verified retained dated source, sequentially by country under the shared lock. Pin rollout source URLs/checksums to retained files so adding categories does not implicitly request a different daily snapshot. Reuse valid Transit context, but invalidate filters/completion caches when category expressions change. Generate geometry and normalized candidate counts in a non-publishing measurement pass (rollback staging/dry run), record them, set explicit national ATM/accommodation floors and then publish complete eight-category snapshots. Never weaken production floors just to count a candidate snapshot. Keep old categories subject to their existing date/count-drop checks. Failures retain all old published data.

Retain normalized/indexed settlement search and lightweight readiness checks. Refresh statistics for country metadata/membership tables after publication. Use spatial candidates before national membership joins, apply filters before the result cap and verify query plans/timings with the expanded dataset.

### Hosting and rollout

Add both hosts to backend/frontend registries, generated shells, local `.localhost` resolution, Docker gateway and shared Nginx/TLS templates. Use the existing Docker Nginx, shared upstream, volumes, PostGIS and host ports. Issue domain certificates via the established challenge and automatic renewal/deploy hook; verify the existing renewal timer. No host Nginx installation. Local debug keeps only PostGIS in Docker and uses small synthetic samples, not national PBFs in Git.

## Risks / Trade-offs

- Sparse/incorrect ATM properties → Preserve unknown values and distinguish host-level evidence; never assume no card fees or 24/7 access.
- Hotel opening hours mistaken for availability → No Stay Open now filter; separate reception/check-in data from availability text.
- Eight-category importer publishes incomplete snapshots → Registry-derived completeness, measured national floors, atomic transactions and failure-retention regressions.
- Repeated national processing consumes time/disk → Reuse verified retained PBF/context; process countries sequentially, measure resources and keep rollback data.
- Expanded data regresses search → Retain index/statistics maintenance and compare identical API searches before/after.

## Migration Plan

1. Record live eight-host routing prerequisites, current six-site counts/IDs/timings, images, source checksums, timer state and verified DB backup. Pause the existing refresh timer during the category transition.
2. Deploy compatible additive schema/API/importer changes; verify current six sites remain ready and both new categories are pending.
3. For DE, RO, AT, HU sequentially: measure normalized candidates without publication, set national floors, publish all eight categories from the pinned retained source, verify existing identities/counts and new readiness. Retain independent rollback per country.
4. Validate new data and all existing sites in Munich, Bucharest, Vienna and Budapest; verify country boundaries, ATM hours/access/fees and Stay types/contact links. Back up before public cutover.
5. Configure both domain vhosts and TLS through Docker Nginx, validate/reload, verify HTTPS and certificate-renewal deploy hooks, then run eight-site live checks and desktop/phone DE/EN/RO/HU checks.
6. Merge approved work into `main`, deploy production from `main`, record VM actions/paths/counts/timings/checksums in a dated project protocol, take a final backup and resume the existing refresh timer. Stop temporary local debug services.

Rollback: pause refresh first. Prefer compatible code retaining eight-category data. Do not run a six-category importer against expanded national snapshots. For incompatible rollback restore the verified matching backup and code/configuration with explicit downtime. Preserve source volumes and rollback backups.

## Open Questions

The owner approved the design and requested Hungarian across the app. Broad Stay types including camping and driving directions are approved. No live provider integration is planned.
