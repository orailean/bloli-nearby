## ADDED Requirements

### Requirement: Eligible station-level car charging

The system SHALL discover active fixed `amenity=charging_station` locations for car charging, including public and customer/destination access, and SHALL exclude private, prohibited, permit-only, inactive, locked, unevaluable conditional-access and bicycle/device-only locations. Explicit car exclusion SHALL override positive connector or brand evidence. Missing access SHALL remain unknown. Dispensers and charging parking spaces SHALL NOT independently become station results in this release.

#### Scenario: Customer charger is included honestly
- **WHEN** a car charging station has `access=customers`
- **THEN** it appears in All and Customers results with a visible customer-only label, and not in Public-only results

#### Scenario: Bicycle and private negatives win
- **WHEN** a station has `motorcar=no` or applicable private/no access, even alongside a CCS tag
- **THEN** it is excluded

#### Scenario: Missing metadata does not become confirmation
- **WHEN** an otherwise eligible charging station lacks access and socket details
- **THEN** it appears under All with those details unknown and does not match Public-only or specific-connector filters

#### Scenario: Station and its dispensers are not double counted
- **WHEN** a station and several `man_made=charge_point` members are mapped
- **THEN** only the station is an independent Charge result

### Requirement: Connector-local power semantics

The system SHALL preserve mapped connector identity, count and raw output and normalize only positive finite unambiguous power values. A connector with explicit zero/no SHALL NOT qualify. A minimum-power filter SHALL require a matching connector with sufficient known output; unknown or ambiguous power SHALL NOT satisfy it. Connector counts SHALL NOT be presented as unoccupied plugs, and power SHALL NOT be presented as guaranteed delivered speed.

#### Scenario: Different connector cannot satisfy power
- **WHEN** a station maps Type 2 at22kW and CCS at150kW and the request selects Type 2 with minimum150kW
- **THEN** that station is excluded

#### Scenario: Unit conversion preserves matching
- **WHEN** a matching CCS socket has output150000W and the minimum is150kW
- **THEN** it satisfies the power condition as150kW

#### Scenario: Ambiguous output remains unknown
- **WHEN** a connector has an unsupported output range or unparseable text
- **THEN** raw detail remains available but it fails any positive minimum-power condition

### Requirement: Charge-specific combined discovery filters

Charge SHALL support one connector selection (All, CCS2, Type 2, CHAdeMO, Other recognized car connectors), minimum power (Any/22/50/150/300kW), access (All/Public/Customers), existing fee filters and mapped-hours filtering. Charge-specific parameters SHALL be validated, host-scoped and applied together before nearest ordering, result limit and truncation. Other sites SHALL reject Charge parameters, and Charge SHALL reject seller/transit filters and category overrides. Defaults SHALL preserve all eligible stations within the selected radius.

#### Scenario: Filtering precedes result cap
- **WHEN** many nearby incompatible stations precede farther compatible stations within the radius
- **THEN** compatible stations remain eligible before the100-result cap is applied

#### Scenario: Cross-host and malformed requests fail
- **WHEN** a Loo request supplies `connector`, or Charge receives a duplicate/invalid connector or unsupported minimum power
- **THEN** the API rejects the request rather than ignoring it or changing categories

### Requirement: Mapped fees and access hours are not availability

Charge SHALL preserve unknown/conditional fees, distinguish charging fees from parking fees and use only supported mapped schedules to confirm current accessibility in Europe/Berlin. Absent hours SHALL NOT imply24/7. Unknown/uncertain/seasonally incomplete hours SHALL fail the active hours filter. No API or presentation field SHALL claim current connector occupancy, operation, guaranteed speed or current tariffs from OSM snapshots.

#### Scenario: Missing hours do not confirm access
- **WHEN** an eligible station lacks opening hours and accessible-now filtering is active
- **THEN** it is excluded despite being mapped as a charging station

#### Scenario: Free charging can still involve parking fees
- **WHEN** charging fee is explicitly no and parking fee is yes
- **THEN** it can match Free charging while displaying parking fees separately

### Requirement: Safe complete six-category publication

Charge SHALL participate in shared source/completion validation, independent minimum/count-drop checks and atomic publication with all five existing categories, settlements and Transit context. Geometry preflight SHALL exercise all required feature kinds. Failed preparation or validation SHALL retain prior active data. Publication success and later maintenance/readiness failures SHALL be distinguishable.

#### Scenario: Incomplete sixth-category import fails safely
- **WHEN** geometry, completion, required category or minimum Charge counts fail
- **THEN** no partial six-category dataset becomes active

#### Scenario: Same-source extension preserves existing sites
- **WHEN** Charge is imported from the retained verified source
- **THEN** the five existing category counts/source timestamps remain unchanged and Transit grouping context remains usable
