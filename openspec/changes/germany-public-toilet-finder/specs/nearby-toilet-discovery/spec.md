## ADDED Requirements

### Requirement: User-selected search location
The system SHALL support user-initiated browser geolocation, map selection, and local German town/postcode search without requiring an account. It MUST offer manual selection when geolocation fails or the position is outside Germany.

#### Scenario: Location permission denied
- **WHEN** the user declines location access
- **THEN** the app offers map selection and town/postcode lookup without repeatedly requesting permission

#### Scenario: Ambiguous settlement
- **WHEN** a town search matches multiple German settlements
- **THEN** the app shows distinguishing region or postcode information, labeled nearby-city context, or coordinates as a fallback and searches only after selection

### Requirement: Bounded nearby results
The system SHALL search within 2 km by default, allow explicit expansion up to 50 km, and return at most 100 results by default ordered by straight-line distance with stable ties. It MUST label the distance basis, disclose truncation, validate search parameters, and distinguish failures from zero results.

#### Scenario: Nearby search succeeds
- **WHEN** facilities exist within the chosen radius
- **THEN** the list and map receive the same distance-ordered result set and the selected origin remains unchanged until the user selects a new one

#### Scenario: Empty or invalid query
- **WHEN** a valid search has no results
- **THEN** the app explains this and offers radius expansion or a different location

#### Scenario: Invalid parameters
- **WHEN** a request has invalid coordinates, radius, limit, or fee value
- **THEN** the API rejects it with a validation error without performing an unbounded query

### Requirement: Explicit fee filters
The system SHALL provide All, Free, and Paid filters. Free MUST match only confirmed free records, Paid MUST match only confirmed paid records, and unknown fee records MUST appear only under All with an Unknown label.

#### Scenario: Unknown fee
- **WHEN** a facility has no usable fee tag
- **THEN** it is not included under Free or Paid and no numeric price is invented

### Requirement: Honest facility details
The system SHALL show available name, distance, fee, access, source opening-hours text, accessibility, provenance, and dataset date. Missing values MUST be identified as unknown; opening-hours text MUST NOT imply verified current opening status.

#### Scenario: Incomplete details
- **WHEN** a selected toilet lacks hours, price, or accessibility information
- **THEN** the app identifies the missing information without claiming it is open, free, or accessible
