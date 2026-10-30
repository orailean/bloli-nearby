# Multi country data

## Purpose

Define independent country sources, atomic per-country publication, shared identities and physical coverage. These requirements extend the original Germany-only baseline. The initial six-site/category rollout is extended by later site-category capabilities; rollout gates describe activation order rather than requiring successfully activated countries to return to pending.

## Requirements

### Requirement: Configurable independent country sources
The importer SHALL support independently verified country sources for Germany, Romania, Austria and Hungary, with checksums, completion markers and coverage provenance in country-specific paths. Germany SHALL remain active. Romania SHALL be the first production country added; Austria and Hungary SHALL remain pending until Romania passes the production validation gate, then activate separately in that order. Unknown country values SHALL fail before publication.

#### Scenario: Reuse another country's source safely
- **WHEN** Romania is prepared while the verified German PBF is retained
- **THEN** Romania uses its own cache and neither replaces nor invalidates Germany's retained source

#### Scenario: Romania release gate controls later countries
- **WHEN** Romania has not passed its data, search, timezone, operations and browser checks
- **THEN** Austria and Hungary remain pending and are excluded from active coverage

### Requirement: Atomic publication scoped to one country
The system SHALL publish all six supported categories and settlements atomically for one country. Count floors, drop checks and source-time validation SHALL be country-specific. Missing categories, invalid data or failed validation SHALL retain that country's previous active snapshot and every other country's data.

#### Scenario: Romanian import fails
- **WHEN** Romania's replacement omits Charge data or fails its own count threshold
- **THEN** no Romanian category or settlement replacement is published and Germany remains unchanged and searchable

#### Scenario: Smaller country is initially imported
- **WHEN** a first Romanian snapshot satisfies its configured bootstrap floors
- **THEN** validation does not compare its counts against the German dataset

#### Scenario: Follow-on country import fails
- **WHEN** Austria or Hungary fails validation after Romania has passed
- **THEN** all previously active country snapshots remain available and the failed country's prior snapshot remains active, if one exists

### Requirement: Shared identities and country contributions
The system SHALL track country contributions separately from globally stable OSM identities, deduplicate search results, and reconcile overlapping payloads deterministically using version provenance. Equal-version material conflicts SHALL fail publication. Removing one contribution SHALL preserve any remaining contribution.

#### Scenario: Border object appears in neighbouring extracts
- **WHEN** Germany and Austria, Austria and Hungary, or Hungary and Romania contain the same mapped source identity
- **THEN** discovery returns it once with one stable identity and deterministic active data

#### Scenario: One extract no longer contributes a shared object
- **WHEN** a successful refresh drops an identity still contributed by another active country
- **THEN** that identity remains discoverable from its surviving contribution

### Requirement: Physical country and supported coverage
The system SHALL distinguish extract membership from physical country using versioned boundary provenance and assign each active place a resolved country/timezone. Usable coverage SHALL include only successfully published supported national areas and SHALL exclude extract buffers outside Germany, Romania, Austria and Hungary.

#### Scenario: Buffered extract contains an unsupported neighbouring place
- **WHEN** a source includes a place physically outside Germany, Romania, Austria and Hungary
- **THEN** that place does not extend advertised coverage into the unsupported country

### Requirement: Per-country data status
The API SHALL expose country/category readiness, counts, source date, import time, freshness and latest refresh result. Aggregate dates SHALL be conservative and SHALL NOT imply that differently dated country snapshots share one source date. Pending countries SHALL be distinguishable from active countries.

#### Scenario: One country remains stale
- **WHEN** Germany and Romania refresh successfully but Austria retains an older snapshot after failure
- **THEN** status exposes each country's date and Austria's failed refresh without making German or Romanian discovery unavailable
