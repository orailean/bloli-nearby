# Charge site operations

This capability covers shared-host routing, local development, production import, TLS renewal, verification, and rollback for Charge.

## Requirements

### Requirement: Sixth hostname on shared infrastructure

`charge.bloli.com` SHALL resolve to the Charge profile through explicit API, gateway and initial HTML routing, using the existing shared containers/database/volumes/network. Unknown-host rejection and isolation across all six sites SHALL remain. No new permanent service, database or host port SHALL be required. Germany SHALL remain the only currently supported country.

#### Scenario: Host selects the right category
- **WHEN** the public Charge hostname requests shell, site profile and discovery
- **THEN** each response belongs to Charge and cannot be overridden into another category

### Requirement: Reuse retained source and protect refresh

Initial Charge preparation SHALL reuse the checksum-matching retained Germany PBF and matching Transit relation sidecar, refilter for station tags and validate all six categories. After activation, scheduled refresh SHALL require all six. Manual rollout SHALL prevent overlapping refresh, restore timer state on failures and verify public queries with current planner statistics after large publication.

#### Scenario: Existing source avoids another download
- **WHEN** the retained PBF matches the selected source checksum and Transit context fingerprint
- **THEN** preparation reuses them and regenerates only the required filter/extraction stages

#### Scenario: Maintenance fails after commit
- **WHEN** table-statistics maintenance or activation fails after validated data commits
- **THEN** operators can identify successful publication and retry maintenance/activation without assuming rollback or repeating the import

### Requirement: Native local samples and verification

Charge SHALL run at `charge.localhost:5173` through the native Vite/API workflow with only PostGIS in Docker. A small guarded synthetic fixture SHALL cover connector-local power, unknown data, customer/public restrictions and excluded sources while preserving other site samples. Verification SHALL cover normalization, query validation, real PostGIS combined filtering/publication, all-site UI/regressions, real public tiles and six-host HTTPS behavior.

#### Scenario: Local development needs no Germany download
- **WHEN** a developer seeds a fresh isolated sample database
- **THEN** all six sites can be debugged natively using the documented workflow without replacing existing local data

### Requirement: Audited TLS rollout and recovery

Deployment SHALL verify DNS, save matching configuration/images and verified pre/post dumps, use existing Docker Nginx/shared proxy and Certbot account, extend and test renewal for all six domains, gracefully reload Nginx and verify timers. A dated actual protocol SHALL be saved in the repository and VM project directory, including failures/retries, counts, sizes, source, revisions, commands and rollback. Datasets, binaries, secrets and generated evidence SHALL remain outside Git.

#### Scenario: Six-domain renewal is verified
- **WHEN** Charge HTTPS is activated
- **THEN** all six domains have successful renewal/deploy-hook tests and the existing services remain healthy

#### Scenario: Cross-schema rollback is documented safely
- **WHEN** an older pre-Charge backup is needed
- **THEN** the procedure uses a separately restored database and matching images/configuration, verifies before switching and preserves the current database/backups until recovery succeeds
