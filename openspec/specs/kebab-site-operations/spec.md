# Kebab site operations

## Purpose

Define shared Kebab infrastructure, native samples, safe HTTPS activation and verified rollout. These baseline requirements are extended by later site-category and multi-country capability specs; initial site/category counts describe the release that introduced this capability.

## Requirements

### Requirement: One shared three-host platform
Kebab SHALL use the existing shared frontend/gateway, API, database, retained source volume and scheduled importer. Production host/category bindings MUST be explicit and preserve Host through both proxy layers. Unknown hosts and untrusted site overrides SHALL remain rejected. Host-port allocations, database credentials and persistent data content SHALL be preserved. Owner-approved resource renaming SHALL use verified copies with PostgreSQL stopped for its physical copy, retain rollback originals and compare logical category counts/metadata before resuming scheduled updates.

#### Scenario: Third domain resolves to shared services
- **WHEN** a request arrives for kebab.bloli.com
- **THEN** it reaches the shared app and only kebab-category discovery data is selected

### Requirement: Native development and small samples
The project SHALL support kebab.localhost:5173 alongside the existing two native development hosts, using one native API/Vite pair and Docker PostGIS. A small synthetic sample SHALL cover all three categories without Germany downloads. Integration tests MUST use disposable data. Local temporary services SHALL be stopped after verification unless the owner requests otherwise.

#### Scenario: Local three-site sample
- **WHEN** a developer seeds a fresh eligible local sample database
- **THEN** each local hostname displays its own category using the same services

### Requirement: Safe activation and renewable HTTPS
Kebab public activation SHALL wait for correct DNS, successful category publication and readiness. Deployment SHALL use the existing Docker Nginx shared proxy include, Let's Encrypt account/webroot and renewal mechanism. Nginx configuration MUST be validated before graceful reload. Renewal checks SHALL cover every supported public domain.

#### Scenario: DNS not yet configured
- **WHEN** kebab.bloli.com does not point to the owner VM
- **THEN** source preparation and local verification can proceed while certificate issuance and public activation remain pending

### Requirement: Verified rollout and protocol
Deployment SHALL preserve prior data on failures, verify all three domains and compare existing-category counts when reusing the same source. The project SHALL contain the actual dated VM protocol, backup references, source identity, timer/update instructions and rollback steps. Only source/configuration/documentation SHALL be committed; datasets, dumps, secrets and generated binaries MUST remain outside Git.

#### Scenario: Successful third-site deployment
- **WHEN** Kebab is activated
- **THEN** all three domains pass routing/readiness/search/mobile checks and the project records the backup, deployed commits and TLS-renewal evidence
