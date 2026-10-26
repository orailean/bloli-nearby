## ADDED Requirements

### Requirement: Compose deployment with persistent state
The system SHALL run through Docker Compose with persistent toilet/settlement database storage, configurable reverse-proxy HTTPS integration, private internal services, health checks and configurable resource limits. Repeated normal startup MUST NOT repeat initial data downloads. The initial deployment MUST NOT require a local map archive or tile-server container.

#### Scenario: Restart deployment
- **WHEN** the operator restarts the Compose services after bootstrap
- **THEN** imported facilities and settlement data remain available without a fresh download

#### Scenario: Missing bootstrap data
- **WHEN** the stack starts without imported data
- **THEN** readiness reports missing initial data and the UI does not misleadingly report that Germany has no toilets

### Requirement: No paid runtime dependencies
The system SHALL serve the app, town/postcode lookup and nearby toilet searches from local services without paid APIs or subscriptions. The browser SHALL load map tiles directly from the public OpenStreetMap tile service, using a configurable provider. UI assets and translation dictionaries MUST be hosted locally. Toilet/settlement dataset downloads MUST use permitted distribution endpoints.

#### Scenario: External services unavailable
- **WHEN** the browser cannot reach the public tile provider but can reach the app host after bootstrap
- **THEN** town/postcode lookup, toilet searches and facility details remain usable, while the map reports tile failure without falsely reporting no facilities

### Requirement: Public map usage and attribution
The app SHALL display public OSM raster tiles for interactive map use throughout Germany, with visible linked source attribution, a valid browser Referer and browser caching that respects provider headers. It MUST NOT bulk download tiles, offer offline tile packs, force cache bypass, or route tiles through its own caching proxy. It SHALL publish an app contact and map-issue link and document the provider's best-effort availability and external map-request privacy implications.

#### Scenario: Interactive map view
- **WHEN** a user views or moves the map
- **THEN** the browser requests normal viewport tiles directly from the configured provider with attribution visible and without initiating a bulk download

#### Scenario: Operator changes provider
- **WHEN** the operator configures an alternative permitted tile URL, attribution and zoom limits
- **THEN** the app uses those settings without changing search data or requiring changes to map-rendering code

### Requirement: Documented operations and location privacy
The deployment SHALL document bootstrap, scheduled refresh, resource measurements, backup, restore and rollback. It MUST expose update timestamps and job outcomes, prevent overlapping updates, keep credentials out of version control, and avoid storing user location history or logging search coordinates routinely.

#### Scenario: Schedule and restore
- **WHEN** an operator follows the documented refresh and backup/restore procedures
- **THEN** jobs run within configured limits and the restored deployment serves the saved facility snapshot

### Requirement: Existing Docker Nginx and automatic HTTPS
The production setup SHALL use the existing Docker Nginx reverse proxy for loo.bloli.com without installing host Nginx or competing for public ports 80/443. It MUST document Let's Encrypt webroot issuance using the existing challenge/certificate mounts, automatic renewal through the existing Snap Certbot timer, and a deploy hook that tests and reloads the Docker proxy after successful app certificate renewal.

#### Scenario: Automatic certificate activation
- **WHEN** the loo.bloli.com certificate renews successfully
- **THEN** the deploy hook validates the container's Nginx configuration and gracefully reloads it to activate the renewed certificate

#### Scenario: Documentation-only preparation
- **WHEN** deployment instructions are prepared before host changes are authorized
- **THEN** the repository contains complete configuration and verification steps while host settings and running services remain unchanged

### Requirement: Native app debugging with a Docker database
The project SHALL provide a separate database-only development Compose configuration with a loopback-only PostGIS port and its own persistent volume. The API and frontend MUST run directly on the developer’s machine, and the API debugger MUST bind to localhost. Optional regional dataset instructions MUST distinguish sampled coverage from full Germany and keep test databases separate.

#### Scenario: Debug without app containers
- **WHEN** the developer starts the development database Compose project and the native API/frontend commands
- **THEN** the app searches its local sample through the native API, while an IDE can attach to the localhost Node inspector without starting app containers
