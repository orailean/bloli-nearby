## ADDED Requirements

### Requirement: Configurable independent country sources
The importer SHALL support DE, AT and RO with independent verified source files, checksums, completion markers and coverage provenance in country-specific paths. It SHALL reject unknown country configuration before publication.

#### Scenario: Reuse another country's source safely
- **WHEN** Austria is prepared while a verified German PBF is retained
- **THEN** Austria uses its own cache and neither replaces nor invalidates Germany's retained source

### Requirement: Atomic publication scoped to one country
The system SHALL publish all supported categories and settlements atomically for one country. Count floors, drop checks and source-time validation SHALL be country-specific. Missing categories, invalid data or failed validation SHALL retain that country's previous active snapshot and every other country's data.

#### Scenario: Romanian import fails
- **WHEN** Romania's replacement omits Kebab data or fails its own count threshold
- **THEN** no Romanian category or settlement replacement is published and Germany and Austria remain unchanged and searchable

#### Scenario: Smaller country is initially imported
- **WHEN** a first Austrian snapshot satisfies its configured bootstrap floors
- **THEN** validation does not compare its counts against the German dataset

### Requirement: Shared identities and country contributions
The system SHALL track country contributions separately from globally stable OSM identities, deduplicate search results, and reconcile overlapping payloads deterministically using version provenance. Equal-version material conflicts SHALL fail publication. Removing one contribution SHALL preserve any remaining contribution.

#### Scenario: A border object occurs in two extracts
- **WHEN** Germany and Austria contain the same mapped source identity
- **THEN** discovery returns it once with one stable identity and deterministic active data

#### Scenario: One extract no longer contributes a shared object
- **WHEN** a successful refresh drops an identity still contributed by another active country
- **THEN** that identity remains discoverable from its surviving contribution

### Requirement: Physical country and supported coverage
The system SHALL distinguish extract membership from physical country using versioned boundary provenance and assign each active place a resolved country/timezone. Usable coverage SHALL include only successfully published supported national areas and SHALL exclude extract buffers outside supported countries.

#### Scenario: Buffered extract contains an unsupported neighbouring place
- **WHEN** a source includes a place physically outside DE, AT and RO
- **THEN** that place does not extend advertised coverage into the unsupported country

### Requirement: Per-country data status
The API SHALL expose country/category readiness, counts, source date, import time, freshness and latest refresh result. Aggregate dates SHALL be conservative and SHALL NOT imply that differently dated country snapshots share one source date.

#### Scenario: One country remains stale
- **WHEN** Germany refreshes successfully but Austria retains an older snapshot after failure
- **THEN** status exposes both dates and Austria's failed refresh without making German discovery unavailable
