## ADDED Requirements

### Requirement: Scheduled and targeted country refreshes
The existing systemd refresh entry point SHALL process configured countries sequentially under shared import locking, record each outcome, continue after individual failures and exit unsuccessfully if any country failed. Operators SHALL be able to retry one country without refreshing or replacing others.

#### Scenario: Austria download fails during weekly refresh
- **WHEN** Germany completes, Austria fails and Romania is pending
- **THEN** Romania is still attempted, Austria keeps its previous snapshot and the overall run reports failure with per-country diagnostics

### Requirement: Preserve existing production resources
The extension SHALL retain existing shared app containers, database/login, generic persistent volumes, Docker Nginx routing, certificates and host port allocation. Migration SHALL preserve verified German data and SHALL NOT delete retained rollback volumes.

#### Scenario: Country migration is deployed
- **WHEN** additive country support is activated
- **THEN** the original German counts and stable identities remain available and no new permanent country-specific containers or published ports are introduced

### Requirement: Native local samples and regression verification
The project SHALL provide small clearly synthetic DE/AT/RO fixtures covering all categories, ambiguous settlements, border duplicates and mixed timezones. Verification SHALL include real isolated PostGIS publication/rollback tests and all-site responsive browser checks. Dataset binaries and production backups SHALL stay outside Git.

#### Scenario: Developer verifies country support locally
- **WHEN** the developer follows the documented native API/Vite and Docker-only DB workflow
- **THEN** all countries and categories can be exercised without downloading full-country data and local debug services can be stopped while retaining DB data

### Requirement: Auditable rollout and rollback
Deployment documentation SHALL record actual VM changes, source paths/dates/counts, backup verification, timer behavior, country retry commands and safe rollback. It SHALL warn against running the old global replacement importer after multi-country activation.

#### Scenario: Rollback is required after activation
- **WHEN** an operator follows the documented rollback procedure
- **THEN** refresh is paused before incompatible code changes and the chosen app/data restoration preserves a coherent snapshot using verified backups
