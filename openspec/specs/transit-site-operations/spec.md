# Transit site operations

## Purpose

Define shared Transit resources, verified source reuse, native samples and auditable operational rollout. These baseline requirements are extended by later site-category and multi-country capability specs; initial site/category counts describe the release that introduced this capability.

## Requirements

### Requirement: Fifth profile on shared resources
Transit SHALL use the existing shared database/login, generic Docker volumes/images, application services and Nginx upstream, with no new permanent services or published host ports. Production and native local hosts SHALL bind explicitly to Transit and unknown production hosts SHALL remain rejected.

#### Scenario: Fifth site is activated
- **WHEN** Transit is deployed
- **THEN** all five domains use the shared stack and existing four sites retain category isolation and behavior

### Requirement: Retained-source reuse and native samples
Initial Transit extraction SHALL reuse the retained checksum-verified Germany PBF when valid, regenerate required transport filters/context and document the distinction between the source file and extracted DB data. Native API/Vite plus Docker-only DB SHALL support small synthetic five-category fixtures without a Germany download.

#### Scenario: Developer tests an interchange locally
- **WHEN** the guarded synthetic seed is loaded in a fresh local sample DB
- **THEN** mode filtering, related components, standalone stops and approximate references can be tested without overwriting saved local data

### Requirement: Verified grouping and service evidence
Verification SHALL cover legacy/PTv2 forms, multi-mode/duplicate/ambiguous groups, member-radius boundaries, unsupported filters, lifecycle negatives, S-Bahn evidence in München/Berlin/Hamburg, unsafe walking targets, missing required geometry and atomic replacement rollback. Public verification SHALL cover all five sites and actual loaded tiles.

#### Scenario: Real source differs from synthetic fixtures
- **WHEN** representative German interchanges and S-Bahn services are checked before rollout
- **THEN** evidence rules and group/direction behavior are verified against those records rather than assumed from a fixture alone

### Requirement: Auditable TLS rollout and scheduling
Transit SHALL reuse the existing ACME account/webroot, Docker Nginx and renewal deploy hook, with validated graceful reload and renewal dry-runs for all five domains. Rollout SHALL verify pre/post-import backups, same-source existing counts, timers and a dated VM protocol including resource paths, runtime, counts, verification and rollback. Temporary helpers/debug services SHALL be stopped or removed while preserving data.

#### Scenario: Rollout completes
- **WHEN** Transit is declared deployed
- **THEN** HTTPS/readiness/public behavior and scheduled refresh/backup/renewal are verified, and actual operations are recorded in the project's deployment protocol
