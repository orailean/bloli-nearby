## Context

Bloli Nearby currently serves Loo, Kippe, Kebab, Water and Transit from one React/Leaflet build, Node API, PostGIS database and Germany importer. Charge becomes the sixth hostname/profile/category. The owner created `charge.bloli.com` and agreed to public plus customer-only electric-car charging, labelled restrictions, and exclusion of private and bicycle-only charging.

Existing preferences continue: free libraries/data, distinctive playful design, responsive header/footer, separate German/English/Romanian JSON, German fallback, München/81243 examples, 0.5 km default and 0.5/1/2/3/5 km choices, native API/Vite debugging with Docker-only DB, no binaries in Git, existing Docker Nginx, shared generic resources and a dated protocol of VM changes. Country expansion stays on hold. This document proposes implementation details for review; no application or host changes are part of proposal creation.

## Goals / Non-Goals

**Goals:** Help drivers find a mapped car charging location matching connector, minimum power and access needs; show useful charging/payment/access details honestly; preserve the five existing sites and shared transactional publication.

**Non-Goals:** Live free/busy or fault status, guaranteed working/available equipment, current tariff comparison, reservations/payment/charging sessions, vehicle profiles/range planning, extra countries, private/home charging, bicycle/device-only charging, paid APIs or another deployment stack.

## Decisions

### Approach and alternatives

Use the retained Germany OSM source and shared six-category platform. This follows the discussed OSM-based scope and current operating model. A live charging-provider integration could add occupancy but needs separately evaluated coverage, licensing, credentials and refresh contracts; defer it. A separate container/database stack duplicates operations without helping discovery; retain shared services.

Proposed first-release boundary: publish `amenity=charging_station` station-level locations. `man_made=charge_point` dispensers and `parking_space=charging` are not independent result candidates. This avoids station/dispenser double counting without another national relation enrichment pipeline. Unmapped station parents can leave individually mapped dispensers undiscoverable; standalone-dispenser enrichment is a later scope extension, rather than silently guessing station identities by proximity. Preserve separate station identities even when names/operators/coordinates resemble each other.

References: [OSM charging stations](https://wiki.openstreetmap.org/wiki/Tag:amenity=charging_station), [socket properties](https://wiki.openstreetmap.org/wiki/Key:socket:*). Source tags describe mapped facts, not live service telemetry.

### Eligibility and access

Keep fixed node/way/relation charging stations and valid representative geometries. Reject lifecycle/inactive/construction sources, route/group/sign-only objects, locked/key-only objects, explicit conditional access without supported evaluation, explicit motorcar exclusion and applicable private/no/permit-only access. Do not infer eligibility from a brand/name alone.

The charging-station tag ordinarily describes motorcar charging; absent vehicle tags can remain eligible. Explicit `motorcar=no` always excludes. Bicycle/scooter/device-only evidence without motorcar permission or recognizable car connector evidence excludes. A mixed car/bicycle facility remains eligible when car charging is supported. Preserve the evidence used to classify it.

Allow explicit public/yes/permissive access and customer/destination access. Customer-only and destination restrictions get visible localized labels; absent access becomes `unknown`, not a confirmed public-access badge. Proposed access filter: `all` (default), `public`, `customers`; customer/destination cases share the customers filter with their precise mapped restriction shown in details. Unknown appears under All only. Evaluate relevant `access`, `motor_vehicle` and `motorcar` restrictions conservatively; contradictory private/no restrictions win. Authentication via app, RFID or membership is informational and alone does not mean private access or public compatibility.

### Charging data and combined filters

Add a Charge-specific normalized object to existing categorized records: access classification/evidence, connector entries, operator/network/brand, capacity, charging fees/raw price text, parking fees separately, mapped payment/authentication methods, hours, website and original source tags. Missing details remain unknown.

Connector controls use one selection: All, CCS (European CCS2 / `socket:type2_combo`), Type 2 (`socket:type2`), CHAdeMO (`socket:chademo`) and Other mapped car connectors. Retain recognized other car connectors individually in details, including Type 1/CCS1/NACS/Tesla-specific mapped connector tags. Do not guess connector compatibility or public access from Tesla branding, adapters or payment networks. Unknown connector data matches All, not a specific connector or Other. Zero/no counts are not usable connectors; explicit yes can identify a connector with unknown count. The exact supported key table is an implementation artifact backed by fixtures; unknown keys retain raw detail but do not automatically establish car compatibility.

Proposed minimum-power options: Any, 22, 50, 150 and 300 kW. Use positive finite, unambiguous per-connector `socket:<type>:output` values, converting explicit W/kW/MW to kW; accept unitless numeric output as kW following the socket convention. Keep unsupported ranges, conditional/multiple/ambiguous values as raw text and unknown numeric power. Do not derive power from voltage/current or treat station totals as per-connector output.

Connector and power conditions must match the same connector entry. For example, Type 2 at22kW plus CCS at150kW does not match Type 2 with minimum150kW. Under All connectors, any known car connector can satisfy power; Other restricts that to recognized other connectors. Missing power fails an active minimum-power filter. Display power as mapped maximum output, not guaranteed delivered speed. Counts/capacity are not free connectors; do not sum socket counts into vehicle capacity.

Use existing All/Free/Paid fee semantics with unknown under All only. Explicit charging `fee=no` means mapped free charging; parking fees are distinct and visible. Conditional/unrecognized fees stay unknown. Preserve raw mapped price text with source-date context, without claiming a current tariff. No inferred free charging.

Add validated Charge-only query parameters `connector`, `minPowerKw` and `chargeAccess`; allow existing `fee` and `openNow`, reject seller/transit filters and category overrides. Other five sites reject Charge-specific parameters. Reject malformed, duplicate and unsupported values. All connector/power/access/fee/hours filters run before distance ordering, result cap and truncation. Use existing spatial indexes and normalized JSON predicates over spatial candidates; add further indexes only if measured Germany queries need them.

### Hours, directions and truthful availability

Use mapped `opening_hours` with the existing conservative Europe/Berlin evaluator. Do not infer 24/7; unknown/unparseable/conditional schedules cannot confirm access now. Seasonal daily-only schedules require explicit season/date evidence, as in Water. Label the control “Accessible now (mapped hours)” and explain that this does not mean a connector is free or working. Explicit mapped24/7 is supported. Existing vending-machine assumptions and other site labels remain unchanged.

Use external Google Maps driving directions for Charge through an explicit site-level directions mode; existing five sites retain their current walking behavior. The destination is the mapped station representative point, without invented road entrances or an origin copied into the URL. Labels describe driving to the mapped location, not guaranteed gate access or route distance. Nearby distances remain straight-line.

### Identity and shared presentation

Proposed visual direction: a light cobalt-and-coral charging forecourt, using Porcelain `#F7F9FC`, Cobalt `#2448D8`, Ink `#17243D`, Coral `#E86A45`, Pale blue `#DCE7FF` and White `#FFFFFF`. Contrast-test actual text/control combinations. Use bundled Bricolage Grotesque for compact, slightly mechanical headings and DM Sans for readable controls/details; reuse the existing free Lucide icon library.

Create original SVG charging-post/cable artwork. A cable physically connects the wordmark/plug motif with the search area; connector silhouettes and kW labels provide meaningful visual hierarchy rather than decorative battery percentages. Retain familiar map/list selection, radius boundary, city shortcuts and footer family links. Keep artwork inside the layout at320px and with long German/Romanian copy. Charge details prioritize connector/power and access, followed by payment/hours/operator. Design remains distinct from Transit’s route diagram and Water’s wave motif.

Use a short cable “plug-in” response to a submitted search and a small socket snap on filter selection; no perpetual charge meter, invented progress, flashing or motion that suggests live occupancy. Reduced motion removes travel/bounce effects. Responsive controls wrap naturally, phone results use page scrolling, desktop results scroll with selection following the map. Keyboard focus, labels, contrast and non-color-only connector/access status are required. Separate JSON lives under `src/web/sites/charge/locales/{de,en,ro}.json`; native host `charge.localhost:5173` and `?site=charge` follow current resolution rules.

### Import and publication

Extend registries, additive category constraints, completion metadata and per-category counts with `charge` and `MIN_CHARGE_STATIONS` (bootstrap default100). Preserve all active categories, settlements and Transit context in every full publication. Require all six after Charge is activated, with independent count/drop/snapshot checks. Existing geometry fallback and fatal missing fixed-location geometry protections apply to Charge.

Refilter the retained checksum-verified Germany source with charging-station candidates; reuse the existing source-bound Transit sidecar. Do not download another snapshot solely to add Charge or rebuild matching Transit context unnecessarily. Run an all-category geometry preflight before full serialization/publication to expose new source-shape problems early. Keep incomplete output separate and never publish it. Measure full-source JSON size/runtime rather than estimating from filtered PBF size. Preserve the five old category counts for the same retained source.

After a large initial expansion, explicitly analyze affected discovery tables after successful publication before public readiness/search verification, so fresh planner statistics do not delay activation. Record maintenance completion separately from transactional data success; maintenance failure must not claim that committed data rolled back. No memory/resource cap increases without measurements. Set the production Charge minimum from real measured source counts.

## Risks / Trade-offs

- Incomplete OSM specifications → unknown stays visible under All, specific filters require positive evidence, and the interface explains mapped-data freshness.
- Station-only first release misses dispenser-only mappings → document the explicit coverage boundary; never inflate results by adding both granularities without proven parent linkage.
- Customer restrictions/payment authentication misunderstood → separate access, payment and authentication facts; labels remain visible on list and details.
- Powerful station contains a slower selected socket → connector-local power matching, regression-tested before result limiting.
- Six-category refresh consumes more disk/time → reuse source/context, stream records, measure resources and preserve prior active data on validation failure.
- Post-publication maintenance/readiness failure → preserve the successful data and verified backup, repair/retry activation without another import.

## Migration Plan

1. Verify six-site local samples, normalization/filter/API isolation, PostGIS publication/query tests, all-language layouts, reduced motion and source geometry behavior. Keep current five-site regressions green.
2. Verify Charge DNS A/AAAA, current stack mounts/ports/timers and existing Nginx/Certbot configuration. Save matching code/images/private config/counts and a verified pre-change dump.
3. Deploy compatible shared images/additive schema. Pause scheduled refresh while the controlled source-reuse six-category import runs; ensure timer restart on all exit paths. Keep Charge's public activation pending successful data and searches.
4. Validate all old counts/source identity and new Charge count/floor, analyze affected tables, test connector-local power/access cases and representative live searches, and verify a post-import dump.
5. Add HTTP challenge and HTTPS host to existing Docker Nginx using the shared proxy, extend the existing renewal hook, test all six certificate renewals and gracefully reload. Add no permanent services or host ports.
6. Verify all six public sites, real map tiles, mobile/locales, driving versus walking links, source dates, no live-availability claims, timers and service health. Save the dated actual VM protocol/logs in the project directory, update README/repository description and commit/push/synchronize source-only changes. Stop temporary local services and remove completed helpers.

For rollback across schema versions, pause refresh and restore the verified pre-change dump into a fresh separate database with matching old images/configuration; verify before switching. Preserve current data/backups until verified. Do not assume an older dump can clean newer foreign keys/category constraints in place, and do not revert to a five-category importer against a six-category active database.

## Open Questions

No blocking owner decisions remain for the proposal. Station-only scope, filter option values, visual tokens and conservative hours defaults are proposed builder choices for review, not additional owner statements. DNS, actual source counts/tag distributions, socket-key fixtures and production query timings require read-only preflight/implementation verification. No live-data provider is being selected.
