# Multi country operations

## Purpose

Define sequential country refreshes, preserved resources, regression verification and gated rollout/rollback. These requirements extend the original Germany-only baseline. The initial six-site/category rollout is extended by later site-category capabilities; rollout gates describe activation order rather than requiring successfully activated countries to return to pending.

## Requirements

### Requirement: Scheduled and targeted country refreshes
The existing systemd refresh entry point SHALL process active countries sequentially under shared import locking, record each outcome, continue after individual failures and exit unsuccessfully if any country failed. Operators SHALL be able to retry one country without refreshing or replacing others. Rollout activation SHALL begin with Germany and Romania, then enable Austria and Hungary individually only after Romania passes its release gate.

Historical clarification: The first scenario below retains its original rollout wording. Its statement that Germany keeps its previous snapshot after a successful German refresh conflicts with independent country publication in [multi-country data](../multi-country-data/spec.md). Successful countries publish independently; a failed country retains its own previous snapshot.

#### Scenario: Romania download fails during weekly refresh
- **WHEN** Germany completes and Romania fails
- **THEN** Germany keeps its previous snapshot, the refresh reports Romania's failure, and no later country is activated by rollout

#### Scenario: Follow-on country refresh fails
- **WHEN** Austria fails while Romania is active and Hungary is pending
- **THEN** Romania and Germany remain searchable, Austria keeps its previous snapshot if any, and Hungary remains pending

### Requirement: Preserve existing production resources
The extension SHALL retain existing shared app containers, database/login, generic persistent volumes, Docker Nginx routing, certificates and host port allocation. Migration SHALL preserve verified German data and SHALL NOT delete retained rollback volumes.

#### Scenario: Country migration is deployed
- **WHEN** additive country support is activated
- **THEN** the original German counts and stable identities remain available and no new permanent country-specific containers or published ports are introduced

### Requirement: Native local samples and regression verification
The project SHALL provide small clearly synthetic DE/RO/AT/HU fixtures covering all six categories, ambiguous settlements, border duplicates and mixed timezones. Verification SHALL include real isolated PostGIS publication/rollback tests and all-site responsive browser checks. Dataset binaries and production backups SHALL stay outside Git.

#### Scenario: Developer verifies country support locally
- **WHEN** the developer follows the native API/Vite and Docker-only DB workflow
- **THEN** all four country configurations and six categories can be exercised without downloading full-country data and local debug services can be stopped while retaining DB data

### Requirement: Gated, auditable rollout and rollback
Deployment documentation SHALL record actual VM changes, source paths/dates/counts, backup verification, timer behavior, country retry commands and safe rollback. It SHALL warn against running the old global Germany-only importer after multi-country activation. Romania SHALL be imported and validated first; Austria and Hungary SHALL be published separately after that gate succeeds.

#### Scenario: Romania fails its release gate
- **WHEN** Romanian data, timezone, search or live site verification fails
- **THEN** Romania is not marked active, Germany remains unchanged and Austria/Hungary remain pending

#### Scenario: Rollback is required after activation
- **WHEN** an operator follows the documented rollback procedure
- **THEN** refresh is paused before incompatible code changes and the chosen app/data restoration preserves a coherent snapshot using verified backups
