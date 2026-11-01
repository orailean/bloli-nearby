## ADDED Requirements

### Requirement: Diagnostic event structure
The application SHALL emit parseable structured operational events with UTC timestamp, severity, service, event name and deployed revision. Failed API operations SHALL include a sanitized cause or error code rather than only a generic failure marker. Validated site, country, job/request identifier, duration and result counts SHALL be included when applicable.

#### Scenario: Unexpected API failure
- **WHEN** an API operation encounters an unexpected internal error
- **THEN** one structured failure event identifies the affected operation and validated site, includes sanitized diagnostic context and can be correlated with the deployed revision
- **AND** the public error response does not disclose internal diagnostics

#### Scenario: Country import outcome
- **WHEN** an import succeeds or fails for a country
- **THEN** its completion event contains country, job identity, outcome, duration and available counts or sanitized failure details
- **AND** the existing completion output and process exit behavior remain compatible with operational scripts

### Requirement: Privacy before export
Operational logs SHALL exclude credentials, authorization headers, visitor IP addresses, precise visitor search coordinates and request query strings. Error details and multiline legacy output SHALL be sanitized before external transmission. Collection SHALL NOT enable HTTP access logging or per-feature import logging.

#### Scenario: Sensitive values in an exception
- **WHEN** an exception includes a request URL with coordinates and an authorization value
- **THEN** neither those values nor the full query string appear in the emitted or forwarded event
- **AND** a safe error classification remains available for diagnosis

#### Scenario: Bulk import
- **WHEN** a national snapshot containing millions of source objects is processed
- **THEN** bounded stage/outcome events describe progress without one event per source object

### Requirement: Operational failure visibility
Scheduled refreshes, backups and deployments SHALL expose sanitized start/completion outcomes with revision, duration and job identity where available. Backup events SHALL NOT contain archive bytes or secrets; log export failure SHALL NOT alter backup retention safeguards or job success semantics.

#### Scenario: Backup archive verification fails
- **WHEN** archive verification fails during a backup
- **THEN** an operational failure is observable with a safe classification
- **AND** the previous backup remains retained under the existing backup policy
