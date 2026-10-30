# Nearby toilet discovery

## Purpose

Define location selection, bounded nearby toilet results, fee filters, details and mapped-hours filtering. These baseline requirements are extended by later site-category and multi-country capability specs; initial site/category counts describe the release that introduced this capability. Multi-country discovery extends the original Germany-only scope and uses each location’s resolved local timezone for Open now.

## Requirements

### Requirement: User-selected search location
The system SHALL support user-initiated browser geolocation, map selection, and local German town/postcode search without requiring an account. It MUST offer manual selection when geolocation fails or the position is outside Germany.

#### Scenario: Location permission denied
- **WHEN** the user declines location access
- **THEN** the app offers map selection and town/postcode lookup without repeatedly requesting permission

#### Scenario: Ambiguous settlement
- **WHEN** a town search matches multiple German settlements
- **THEN** the app shows distinguishing region or postcode information, labeled nearby-city context, or coordinates as a fallback and searches only after selection

### Requirement: Bounded nearby results
The system SHALL search within 0.5 km by default, offer 0.5/1/2/3/5 km choices up to a maximum of 5 km, and return at most 100 results by default ordered by straight-line distance with stable ties. It MUST label the distance basis, disclose truncation, validate search parameters, and distinguish failures from zero results.

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

### Requirement: Search area follows radius changes
The map SHALL display the chosen radius around the search origin and fit its viewport when the origin or radius changes, respecting reduced motion preferences on desktop and mobile.

#### Scenario: Change search radius
- **WHEN** the user changes the search radius around an existing origin
- **THEN** the map displays the chosen radius and fits its viewport while respecting reduced motion

### Requirement: Open now filter
The user MAY restrict results to toilets open according to recorded OSM schedules evaluated in Europe/Berlin. Missing, invalid, uncertain and unresolved holiday-dependent hours SHALL be excluded while enabled. Fee, radius, stable distance ordering and result limits SHALL apply to matching open results. The interface SHALL explain that this uses recorded hours and refresh the active search every minute.

#### Scenario: Filter using recorded hours
- **WHEN** the user enables Open now
- **THEN** results exclude missing, invalid or uncertain schedules before applying ordering and limits, and the interface explains recorded-hours evaluation and refreshes the active search every minute
