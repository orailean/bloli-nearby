## 1. Confirm design and source evidence

- [x] 1.1 Review and approve the written Charge design, including station-only coverage, access labels, power/connector options and mapped-hours wording; keep country expansion on hold.
- [x] 1.2 Inspect retained Germany charging-station tag distributions and representative München/Berlin/Hamburg records, car/bicycle negatives, access, sockets, output units and station geometries without changing active data.
- [x] 1.3 Freeze the supported car-connector mapping/normalization fixtures and measure station-only coverage; retain dispensers as out of scope unless the owner revises the design.

## 2. Normalize and prepare six-category data

- [x] 2.1 Add failing eligibility regressions for public/customer/unknown access, explicit car/private/lifecycle negatives, mixed bicycle/car and station-versus-dispenser distinctions.
- [x] 2.2 Add Charge profile/types and normalized connector, power, access, payment/authentication, capacity and separate charging/parking fee details with raw evidence preserved.
- [x] 2.3 Add power parsing/count regressions for zero/no, yes with unknown count, W/kW/MW/unitless values, invalid/range/conditional output and brand/adapter non-inference; implement only supported conversions.
- [x] 2.4 Extend osmium candidate filtering, geometry/completion metadata and the all-category geometry preflight; reuse verified source and matching Transit sidecar and retain fatal missing required geometry checks.
- [x] 2.5 Add rerunnable schema/category/import count support, independent Charge minimum/drop checks and six-category transactional publication preserving settlements and Transit components.
- [x] 2.6 Test six-category success and retention of all prior data on incomplete source/category/context/geometry/count failures; separate post-publication statistics maintenance outcomes from committed dataset success.

## 3. Combined discovery and API isolation

- [x] 3.1 Add validated Charge-only connector/minPowerKw/chargeAccess parameters and allow fee/mapped-hours filters; reject duplicate/invalid/cross-host/unsupported filters and category overrides.
- [x] 3.2 Implement connector-local power and access predicates on spatial candidates before ordering/result cap/truncation; verify unknown data remains only under eligible unfiltered views.
- [x] 3.3 Test real PostGIS queries for mixed connector powers, unknowns, customer/public restrictions, more-than100 candidates, stable source identity and six-host isolation.
- [x] 3.4 Apply conservative mapped hours and seasonality without assumed24/7, preserve existing other-site behavior, and test fee/parking-fee distinction and safe external URLs.

## 4. Charge presentation

- [x] 4.1 Add separate DE/EN/RO content with German fallback, clear customer/access/unknown labels, mapped maximum power and explicit absence of live occupancy/fault claims.
- [x] 4.2 Build original charging-post/cable artwork, cobalt/coral token system, bundled typography/icons and responsive Charge header/footer within the shared site family.
- [x] 4.3 Implement accessible connector/power/access/fee/mapped-hours controls and charging details; preserve radius fitting, latest-request state, map/list selection and natural phone scrolling.
- [x] 4.4 Add site-specific driving directions for Charge with mapped destination only; preserve walking directions and labels for all five existing sites.
- [x] 4.5 Add short action-driven plug/socket transitions and reduced-motion alternatives without fake charging/availability progress.
- [x] 4.6 Verify desktop and320/390/430px DE/EN/RO, keyboard/focus/contrast, long copy, no artwork overlap or horizontal overflow, filter races and map/list interactions.

## 5. Native development, routing and readiness

- [x] 5.1 Add Charge initial shell/canonical metadata/favicon and explicit production/native host resolution with strict unknown-host handling.
- [x] 5.2 Extend guarded small six-category samples and native debugging docs for charge.localhost:5173 with Docker-only DB, preserving existing local datasets and separate translations.
- [x] 5.3 Add HTTP/HTTPS Nginx templates using the shared proxy and document sixth-domain Certbot renewal-hook, shared data paths, updates and cross-schema rollback.
- [x] 5.4 Extend production checks to all six sites and Charge connector/power/access/driving details; run relevant unit/importer/PostGIS/browser/build/image-readability checks.
- [x] 5.5 Obtain a fresh implementation review, fix material findings with reproducing regressions, and commit/push source-only implementation once release checks pass.

## 6. Controlled production rollout and protocol

- [x] 6.1 Verify Charge DNS, current generic mounts/ports/timers and shared Docker Nginx/Certbot; save matching revisions/images/private config/counts and verify a pre-change dump.
- [x] 6.2 Deploy compatible images/schema, pause overlapping refresh safely, reuse verified Germany source/Transit context, run full geometry preflight and six-category extraction/import with measured resource use.
- [x] 6.3 Compare the five original counts/source timestamps, validate Charge count and set its measured floor, analyze affected tables and verify representative combined searches plus a post-import dump.
- [x] 6.4 Issue Charge TLS through existing ACME infrastructure, extend the renewal hook to six domains, test all six renewals and gracefully activate the checked Nginx vhost.
- [x] 6.5 Verify all six live sites with real tiles, representative charging filters, languages/phone layouts and driving-versus-walking links; resume/verify refresh and certificate timers.
- [x] 6.6 Save the actual dated VM protocol, failure/retry and source/size/timing evidence in the project directory; update README/repository metadata, commit/push/synchronize docs and remove completed helpers/local debugging without removing active data/backups.
