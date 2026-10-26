## ADDED Requirements

### Requirement: Rename preserves existing data
The platform SHALL use Bloli Nearby and repository bloli-nearby while preserving public site identities and existing production volumes, secrets and data. Rename procedures MUST explicitly bind existing volume identities and prevent duplicate active stacks or schedulers.

#### Scenario: Checkout directory changes
- **WHEN** the production checkout is renamed
- **THEN** the database/import mounts still point to the inventoried volumes and existing WC records remain available

### Requirement: Shared production HTTPS deployment
Both domains SHALL use the existing Docker Nginx and shared app gateway/API/database without adding public application port bindings. Each domain SHALL have valid HTTPS, automatic renewal and a validated domain-scoped proxy reload. Unrelated services MUST remain unaffected.

#### Scenario: Add Kippe
- **WHEN** kippe DNS is verified and its certificate is issued
- **THEN** both domains route to their own site profiles over valid HTTPS and Loo remains functional

### Requirement: Native two-site debugging
Developers SHALL be able to run one native frontend/API with Docker-only development PostGIS, access both site profiles through documented local hostnames and seed small mixed-category fixtures without downloading Germany or running the application in Docker.

#### Scenario: Switch local domain
- **WHEN** a developer opens loo.localhost:5173 and kippe.localhost:5173
- **THEN** both work against the same development services with their own design and correctly isolated category data

### Requirement: Verification and deployment protocol
Tests SHALL cover both domains, category isolation, classifier uncertainty, atomic import failure, shared-source reuse, host routing, translation parity and desktop/mobile interactions. Production migration SHALL record actual changes, versions, validation and rollback instructions in the project directory. Binaries, datasets and secrets MUST remain outside Git.

#### Scenario: Production release
- **WHEN** the shared platform is deployed
- **THEN** the protocol records backup/volume checks, repository/checkout/timer changes, imports, HTTPS renewal and both sites' live verification results

#### Scenario: Failed cutover
- **WHEN** the new deployment fails required checks
- **THEN** the recorded rollback restores the prior functioning Loo deployment without deleting persistent volumes
