# ATM and Stay site operations

## Purpose

This capability describes multilingual experiences, shared operations, domain integration and release checks for ATM and Stay sites.

## Requirements

### Requirement: Focused multilingual experiences
ATM and Stay SHALL have distinct subject-specific designs with useful headers/footers, free icons, responsive map/list discovery and separate DE/EN/RO/HU content with German fallback. Both SHALL retain 0.5 km default radius and 0.5/1/2/3/5 km choices, manual location acquisition and country-aware settlement search. Motion SHALL respect reduced-motion preferences and content SHALL fit 320/390/430 px screens without horizontal overflow.

#### Scenario: Unsupported browser language
- **WHEN** a first-time visitor uses an unsupported browser language
- **THEN** the site defaults to German and offers English, Romanian and Hungarian

### Requirement: Shared four-country operations
Both sites SHALL use the existing shared Docker services, PostGIS database, generic volumes, network and host ports. They SHALL cover the four active DE/RO/AT/HU snapshots, preserve existing six-site behavior and use pinned verified retained sources for the controlled rollout. Category cache invalidation SHALL include ATM and accommodation filter changes. Measurement SHALL not publish candidate data or weaken production floors.

#### Scenario: Reusing a verified national source
- **WHEN** ATM and Stay are prepared from a retained country PBF matching its pinned checksum
- **THEN** both categories are filtered together without downloading another full PBF or reusing stale six-category extraction output

### Requirement: Domain and certificate integration
Production SHALL resolve `atm.bloli.com` and `stay.bloli.com` to the correct site/category via the existing Docker Nginx upstream and provide HTTPS with automated certificate renewal and reload hooks. Local native debugging SHALL support both site identities with only PostGIS in Docker. Local/national binaries and secrets SHALL remain outside Git.

#### Scenario: New hostname is accessed
- **WHEN** a visitor opens either new HTTPS hostname after cutover
- **THEN** the correct category, metadata, language content and valid certificate are served

### Requirement: Audited release and search performance
Implementation SHALL merge into `main` before production cutover and production SHALL run from `main`. Release checks SHALL cover all eight sites in all four countries, filters, failed-import retention, DE/EN/RO/HU mobile UI, TLS renewal and before/after search timing. Country membership statistics and settlement prefix indexes SHALL remain maintained. A dated protocol SHALL record backups, paths, sources, counts, resources, deployment and timer state; temporary local services SHALL be stopped.

#### Scenario: A country import fails
- **WHEN** any category validation fails during expansion
- **THEN** prior data stays active, new hosts do not advertise unready coverage and the failure is recorded for targeted retry
