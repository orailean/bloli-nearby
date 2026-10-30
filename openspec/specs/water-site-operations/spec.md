# Water site operations

## Purpose

Define shared Water infrastructure, source reuse, local samples, renewable HTTPS and documented rollout. These baseline requirements are extended by later site-category and multi-country capability specs; initial site/category counts describe the release that introduced this capability.

## Requirements

### Requirement: Fourth host on shared infrastructure
The system SHALL bind Water to `water.bloli.com` in production and `water.localhost` in native development. It SHALL retain one shared database and service stack, existing generic resource names and ports, explicit category isolation and unknown-host rejection.

#### Scenario: Water API host isolation
- **WHEN** a Water-host request attempts to override its category to tobacco
- **THEN** the request is rejected rather than serving Kippe data

### Requirement: Reuse verified source and provide local samples
Initial deployment SHALL reuse the retained verified Germany PBF where valid and regenerate filters that previously omitted Water. Local development SHALL support native Vite/API with a Docker-only DB and small synthetic four-category samples. Dataset binaries, backups and secrets SHALL remain outside Git.

#### Scenario: Native developer workflow
- **WHEN** a developer follows Water's local instructions
- **THEN** all four profiles can be tested with a small sample without full Germany data or Docker-hosted app processes

### Requirement: HTTPS and automatic renewal
Water SHALL use the existing Docker Nginx shared upstream, ACME account/webroot and certificate-renewal infrastructure. Configuration SHALL be validated before graceful reload and renewal dry-run SHALL include deployment-hook execution. Existing sites SHALL remain operational.

#### Scenario: Water certificate renews
- **WHEN** renewal succeeds for Water
- **THEN** the shared deploy hook validates and gracefully reloads Nginx to serve the renewed certificate

### Requirement: Verified documented deployment
Rollout SHALL include verified pre/post-import backups, same-source count comparisons, four-host API/browser verification, source dates/counts, TLS checks and a dated VM protocol with actual commands/paths/results and rollback. Temporary local debugging SHALL be stopped afterward without deleting data.

#### Scenario: Operator reviews the completed rollout
- **WHEN** the operator reads the deployment protocol
- **THEN** active revision, resource/source paths, category counts, certificate renewal and update/rollback commands can be identified
