## 1. Baseline and migration safety

- [x] 1.1 Record current application behavior and create mixed-category fixtures for machines, tobacco shops, explicitly tagged retailers/fuel stations, negative evidence, lifecycle/access restrictions and multi-category source objects.
- [x] 1.2 Define and verify explicit bindings for existing production data/import volumes, Compose identity, gateway aliases and timer paths; prepare backup/rollback checks before any rename.
- [x] 1.3 Document supported tobacco-sales tags, seller classification and provenance/availability wording; inspect retained-source tag distributions before setting category thresholds.

## 2. Categorized data and importer

- [x] 2.1 Add additive schema migrations for generic source identities, category memberships and category-aware dataset metadata; preserve WC compatibility reads and verify existing rows migrate without loss.
- [x] 2.2 Implement tested seller normalization and type classification, including semicolon vending values, positive/negative sales evidence, inactive/private exclusions and unknown attributes.
- [x] 2.3 Extend OSM filter/extraction to all seller candidates and supported fixed geometries while retaining toilet/place/postcode behavior; invalidate cached filtering when expressions change.
- [x] 2.4 Reuse a pinned, verified retained source for initial extension; stage coherent data and apply measured per-category count/drop validation with transactional publication and failed-refresh retention.
- [x] 2.5 Verify repeat-import deduplication, dual category membership, missing-category readiness and failed seller import preserving the active WC dataset in isolated PostGIS tests.

## 3. Host profiles and shared API

- [x] 3.1 Add explicit production/development hostname profiles and reject unknown hosts/untrusted overrides; preserve original Host through Vite and both proxy layers.
- [x] 3.2 Add site configuration and generic site-scoped location discovery, with a temporary Loo-only WC compatibility endpoint and category isolation in database queries.
- [x] 3.3 Implement capability-validated WC fee and Kippe seller-type filters; retain Open now, 0.5-km default, 0.5/1/2/3/5-km choices, stable spatial ordering and accurate truncation.
- [x] 3.4 Verify domain/category separation, unsupported filters, shared postcode search and category-aware status under both local and production-like proxy hosts.

## 4. Shared frontend and two designs

- [x] 4.1 Extract shared search/map/list/navigation components and compose site modules for profile, theme, artwork, filters and details without scattering domain checks through shared components.
- [x] 4.2 Split shared and site-specific DE/EN/RO JSON content, preserving translation parity, saved preferences and German fallback independently on each hostname.
- [x] 4.3 Preserve Loo's design and implement Kippe's distinct kiosk/vending-inspired identity, artwork, header/footer, seller pins, payment/details and source-availability wording using project design guidance.
- [x] 4.4 Generate and route domain-specific initial HTML metadata, canonical URLs and favicons from the shared build; prevent branding flashes and cross-host cache confusion.
- [x] 4.5 Verify radius zoom/boundary, Open now, marker/list selection, natural phone scrolling, keyboard use, reduced motion and all-language phone layouts with visual inspection and Chromium/WebKit checks.

## 5. Naming and local workflow

- [x] 5.1 Rename project/package/repository descriptions to Bloli Nearby/bloli-nearby, update links/operator commands and retain a documented mapping of historical resource names.
- [x] 5.2 Support loo.localhost:5173 and kippe.localhost:5173 with one native Vite/API pair and the Docker-only development database; document host-resolution fallback and development-only site overrides.
- [x] 5.3 Add a small deterministic local seed for both categories and end-to-end projects/contexts for each site, without checking binaries or full datasets into Git.
- [x] 5.4 Run unit, classifier, isolated integration, dual-host build/proxy and browser suites; rehearse schema rollback/backup restore against disposable data.

## 6. Production migration and verification

- [x] 6.1 Back up and inventory the VM, verify actual source checksum/date and database/volume counts, then rename the GitHub repository/remotes and canonical VM checkout with pinned resource identities.
- [x] 6.2 Update backup/refresh paths and generic gateway alias; verify only one application stack and one active set of timers remain and no additional host ports are published.
- [x] 6.3 Import the expanded Germany snapshot from retained source and verify category counts/readiness plus WC data retention; record resource use and source reuse.
- [x] 6.4 Verify kippe DNS and add its virtual host/certificate using existing Docker Nginx and Certbot webroot; validate configuration and gracefully reload, then verify renewal for both domains.
- [ ] 6.5 Deploy shared API/web and verify both public domains' initial metadata, correct categories, searches, filters, map images, directions, translations, phone widths and HTTPS.
- [ ] 6.6 Save the complete migration/deployment protocol and final backup in the project directory, commit/push source-only changes and documentation, synchronize production checkout and record rollback commands.

## 7. Owner refinements during rollout

- [x] 7.1 Add labelled assumed 24/7 hours for machines without source hours, preserving explicit schedules and existing-data behavior.
- [ ] 7.2 Include mapped fuel stations with unconfirmed tobacco-sales labels and reimport/verify the expanded Germany dataset.
- [ ] 7.3 Rename production database/login to bloli_nearby/bloli, retain password/ownership and verify all operational commands.
- [ ] 7.4 Rename the local checkout folder to bloli-nearby and verify local/GitHub/VM synchronization after final checks.
