## ADDED Requirements

### Requirement: Three countries on each existing site
Loo, Kippe and Kebab SHALL discover their existing mapped categories throughout active DE/AT/RO coverage using the existing domains, shared deployment and category isolation. Existing category inclusion/exclusion rules SHALL remain in force.

#### Scenario: Search each category in a newly activated country
- **WHEN** a user searches Vienna or Bucharest on any of the three sites after country activation
- **THEN** matching mapped places for that site's category are returned without another domain or deployment

### Requirement: Country-aware settlement search
The interface SHALL provide an optional accessible country selector defaulting to all supported countries. Suggestions SHALL identify country, support country filtering and Romanian accented/unaccented matching, and preserve original display names. Unsupported country parameters SHALL be rejected.

#### Scenario: Ambiguous town or postcode
- **WHEN** multiple countries match a town name or postcode
- **THEN** suggestions distinguish them by country and selecting one centres discovery on that settlement

#### Scenario: Unaccented Romanian query
- **WHEN** a user enters an unaccented equivalent of a mapped Romanian settlement name
- **THEN** the correct suggestion can be found and displays its original diacritics

### Requirement: Nearby searches can cross supported borders
The country selector SHALL filter settlement suggestions without restricting radius results or moving an existing search centre. Radius discovery SHALL use combined active coverage and deduplicate identities before result limits. Existing radii, 0.5 km default and map/list synchronization SHALL be preserved.

#### Scenario: Search near the German-Austrian border
- **WHEN** a search centre inside active coverage has matching places on both sides within the chosen radius
- **THEN** results include both countries once per identity and map/list reflect the same radius and places

### Requirement: Open now uses local civil time
Open now SHALL evaluate each location at the same absolute instant using its resolved IANA timezone and country/subdivision holiday context, without cross-request process timezone mutation. Unresolvable holiday schedules SHALL retain unknown behavior. Existing machine defaults and explicit schedule precedence SHALL be preserved.

#### Scenario: Romania and Germany differ at the same instant
- **WHEN** two venues share a daily schedule but one is in Bucharest and one in Munich
- **THEN** each result reflects its own local time, including midnight and DST boundaries, independently of evaluation order or server timezone

#### Scenario: Holiday context is incomplete
- **WHEN** a schedule depends on a holiday/subdivision the system cannot resolve safely
- **THEN** it is not presented as confirmed open by the Open now filter

### Requirement: Multilingual coverage and responsive controls
Each site SHALL describe DE/AT/RO coverage, unsupported areas and country update status in separate German, English and Romanian translations. Unsupported browser languages SHALL default to German. Country controls and status SHALL fit 320 px phones with accessible labels, keyboard navigation and no horizontal overflow.

#### Scenario: Romanian phone experience
- **WHEN** a user searches in Romanian on a 320 px phone
- **THEN** country search, results, map and country-specific update information remain readable and operable without sideways page scrolling
