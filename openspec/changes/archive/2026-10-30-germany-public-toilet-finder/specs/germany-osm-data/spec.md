## ADDED Requirements

### Requirement: Germany-wide facility ingestion
The importer SHALL process the Germany OSM extract, including standalone toilet nodes, ways, relations and explicitly public toilets inside venues. It MUST exclude explicit private, prohibited, customer-only and restricted-key-only access, normalize namespaced venue tags, preserve source identity, and derive valid representative coordinates for areas.

#### Scenario: Area and venue toilets
- **WHEN** an extract contains a toilet area and a venue with explicitly public toilets
- **THEN** both are imported with coordinates and their respective source identities

#### Scenario: Restricted facilities
- **WHEN** source tags explicitly restrict a toilet to customers, private users, or special-key holders
- **THEN** it is excluded from public results

### Requirement: Conservative normalization and provenance
The system SHALL preserve raw tags, source type/id, dataset time and import time. It MUST normalize missing or ambiguous fees as unknown, retain original charges and hours, retain accessibility uncertainty, and label unspecified access as unconfirmed.

#### Scenario: Conditional fee
- **WHEN** a facility has an ambiguous or conditional fee
- **THEN** its normalized fee is unknown and its original fee information is retained for details

### Requirement: Safe repeatable refresh
The importer SHALL stage and validate replacement datasets, prevent overlapping runs, and publish atomically. Reimporting a snapshot MUST NOT create duplicate source identities. Failed validation or download MUST preserve the active dataset and expose the failure to the operator.

#### Scenario: Refresh fails
- **WHEN** a refresh is interrupted or produces a suspiciously incomplete dataset
- **THEN** searches continue using the previous dataset and the job records a failure

#### Scenario: Repeat import
- **WHEN** the same snapshot is imported twice
- **THEN** each source identity appears at most once in the active dataset
