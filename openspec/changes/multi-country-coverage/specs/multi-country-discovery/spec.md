## ADDED Requirements

### Requirement: Four countries on all six existing sites
Loo, Kippe, Kebab, Water, Transit and Charge SHALL discover their existing mapped categories throughout successfully activated Germany, Romania, Austria and Hungary coverage, using the existing domains, shared deployment and category isolation. Germany and Romania SHALL be active first. Austria and Hungary SHALL become searchable individually only after the Romanian release gate passes. Existing category inclusion/exclusion rules SHALL remain in force.

#### Scenario: Search Germany and Romania in the first release
- **WHEN** a user searches Munich or Bucharest on any of the six sites after Romania activation
- **THEN** matching mapped places for that site's category are returned from the active country snapshots without another domain or deployment

#### Scenario: Follow-on countries become active separately
- **WHEN** Romania passes its release gate and Austria is published, while Hungary is still pending
- **THEN** Vienna and Austrian locations are available, Budapest and Hungarian locations remain unavailable, and Germany/Romania remain searchable

### Requirement: Country-aware settlement search
The interface SHALL provide an optional accessible country selector defaulting to all active countries. Suggestions SHALL identify country, support country filtering and Romanian accented/unaccented matching, and preserve original display names. Pending or unsupported country parameters SHALL be rejected or clearly reported.

#### Scenario: Ambiguous town or postcode
- **WHEN** multiple active countries match a town name or postcode
- **THEN** suggestions distinguish them by country and selecting one centres discovery on that settlement

#### Scenario: Unaccented Romanian query
- **WHEN** a user enters an unaccented equivalent of a mapped Romanian settlement name
- **THEN** the correct suggestion can be found and displays its original diacritics

### Requirement: Nearby searches cross active supported borders
The country selector SHALL filter settlement suggestions without restricting radius results or moving an existing search centre. Radius discovery SHALL use combined active coverage and deduplicate identities before result limits. Existing radii, 0.5 km default and map/list synchronization SHALL be preserved.

#### Scenario: Search across the Germany-Austria border after Austria activation
- **WHEN** a search centre inside active coverage has matching places on both sides within the chosen radius
- **THEN** results include both countries once per identity and map/list reflect the same radius and places

#### Scenario: Pending countries do not leak into nearby results
- **WHEN** Romania is active but Austria and Hungary have not passed their activation gates
- **THEN** only successfully active country data is returned and the interface does not claim broader coverage

### Requirement: Open now uses local civil time
Open now SHALL evaluate each location at the same absolute instant using its resolved IANA timezone and country/subdivision holiday context, without cross-request process timezone mutation. Germany, Romania, Austria and Hungary SHALL use the correct local civil time, including DST. Unresolvable holiday schedules SHALL retain unknown behavior. Existing machine defaults and explicit schedule precedence SHALL be preserved.

#### Scenario: Romania and Germany differ at the same instant
- **WHEN** two venues share a daily schedule but one is in Bucharest and one is in Munich
- **THEN** each result reflects its own local time, including midnight and DST boundaries, independently of evaluation order or server timezone

#### Scenario: Holiday context is incomplete
- **WHEN** a schedule depends on a holiday/subdivision the system cannot resolve safely
- **THEN** it is not presented as confirmed open by the Open now filter

### Requirement: Multilingual coverage and responsive controls
Each site SHALL describe active and pending country coverage and country update status in separate German, English and Romanian translations. Unsupported browser languages SHALL default to German. Country controls and status SHALL fit 320 px phones with accessible labels, keyboard navigation and no horizontal overflow. Hungarian interface translation is not part of this change.

#### Scenario: Romanian phone experience
- **WHEN** a user searches in Romanian on a 320 px phone
- **THEN** country search, results, map and country-specific update information remain readable and operable without sideways page scrolling
