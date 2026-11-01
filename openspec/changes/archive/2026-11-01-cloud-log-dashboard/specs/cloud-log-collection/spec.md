## ADDED Requirements

### Requirement: Deferred and explicit activation
Cloud collection SHALL remain disabled until the main-only deployment pipeline is verified, the user confirms the provider/stack, and required credentials are provisioned securely. Creating proposal artifacts SHALL NOT create a cloud account, change billing or transmit logs.

#### Scenario: Proposal exists without credentials
- **WHEN** this change is proposed but the account and pipeline prerequisites are incomplete
- **THEN** production services continue without new external log collection

### Requirement: Project-scoped collection
One collector SHALL gather only explicitly allowed Bloli Nearby services, approved refresh/backup units and selected deployment logs. It SHALL support one-off importer output and restarted services, retain read positions across collector restarts, and exclude other applications on the shared VM.

#### Scenario: Unrelated Docker service emits logs
- **WHEN** another VM application writes a log line
- **THEN** the Bloli Nearby collector does not forward it

#### Scenario: Importer exits and collector restarts
- **WHEN** a discovered importer emits its final outcome and exits, followed by a collector restart
- **THEN** the completed job remains searchable once forwarded
- **AND** retained read positions prevent replaying the entire local history during normal restart recovery

### Requirement: Bounded failure and free-budget operation
Collection SHALL have documented CPU, memory, local storage/age and ingestion budgets, with retry/saturation behavior verified before activation. Application work SHALL NOT depend on cloud delivery. The configured free allowance SHALL be monitored, and quota pressure SHALL cause controlled throttling or stopping rather than an automatic paid upgrade.

#### Scenario: Cloud endpoint is unavailable
- **WHEN** the log endpoint is unreachable beyond the configured retry/buffering budget
- **THEN** local collector resource use stays bounded and its loss/recovery state is observable
- **AND** API requests, database imports, backups and deployment checks continue independently

#### Scenario: Ingestion approaches the free limit
- **WHEN** measured usage reaches the configured budget threshold
- **THEN** the configured warning/throttle/stop action occurs and no paid plan is enabled without user authorization

### Requirement: Searchable operational dashboard
A versioned dashboard SHALL support service, site, country, revision and time filtering; recent API errors; import outcome/duration/counts; and refresh, backup and deployment failures with last-success visibility. Stable stream labels SHALL be separated from high-cardinality event fields.

#### Scenario: Investigating a failed weekly import
- **WHEN** the operator filters by the affected country and job period
- **THEN** progress, sanitized failure details and the relevant revision can be correlated with the preceding successful run within the available retention window

### Requirement: Secure and removable integration
Cloud credentials SHALL remain outside Git, browser assets and normal logs, with ingestion and dashboard-administration access separated. The integration SHALL have documented setup, rotation, verification and removal steps. Notification recipients SHALL be configured only after user selection.

#### Scenario: Collector is disabled
- **WHEN** the operator follows the removal procedure
- **THEN** log export stops and its ingestion credential can be revoked without changing application data, public routing or existing schedules
