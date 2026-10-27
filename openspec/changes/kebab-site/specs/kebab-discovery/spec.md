## ADDED Requirements

### Requirement: Mapped Döner and kebab venue classification
The system SHALL include active, accessible fixed restaurants and fast-food venues with cuisine tokens kebab, doner, doener or döner, handling case and semicolon lists. It SHALL exclude private/inactive venues and SHALL NOT infer cuisine from a business name or Turkish cuisine alone. Each result MUST preserve OSM identity and original tags.

#### Scenario: Multiple mapped cuisines
- **WHEN** a public fast-food venue has cuisine=pizza;kebab
- **THEN** it is included in the kebab category with its original identity and tags

#### Scenario: Generic Turkish restaurant
- **WHEN** a restaurant is tagged only cuisine=turkish without a qualifying cuisine token
- **THEN** it is not included solely by that cuisine or its name

### Requirement: Fixed food venue geometry
Extraction SHALL support qualifying nodes, ways, multipolygons, site relations and building relations using valid mapped geometry. Missing fixed geometry SHALL fail extraction before publication. Valid same-source memberships in multiple categories SHALL be retained independently without duplicate source/category rows.

#### Scenario: Supermarket and kebab venue share an identity
- **WHEN** one valid mapped object qualifies for tobacco and kebab categories
- **THEN** one shared location identity supports both category memberships without leaking either into the other host's results

#### Scenario: Building relation outline
- **WHEN** a qualifying building relation has a valid mapped outline
- **THEN** extraction returns a representative location and preserves the relation identity

### Requirement: Complete three-category publication
The importer SHALL validate every declared category, require every already-active category in replacement snapshots, and publish locations, memberships, settlements and metadata atomically. Per-category minimums, timestamp and count-drop checks SHALL apply independently. Failure SHALL retain all active datasets and record a failed job.

#### Scenario: First third-category import
- **WHEN** toilets and tobacco are active and a valid snapshot declares all three categories
- **THEN** all three publish coherently from the same verified source

#### Scenario: Partial refresh after activation
- **WHEN** kebab is active and a replacement omits it or another active category
- **THEN** publication is rejected and all existing datasets remain unchanged

### Requirement: Kebab search capabilities and mapped hours
Kebab requests SHALL use category-isolated distance ordering, the 0.5 km default, only 0.5/1/2/3/5 km choices and existing truncation behavior. Open now SHALL filter known schedules before result limiting using German local time. Missing hours SHALL remain unknown; the machine 24/7 assumption SHALL NOT apply. Fee, tobacco seller-type and category override filters SHALL be rejected.

#### Scenario: Unknown shop hours
- **WHEN** a kebab venue has no mapped opening hours and Open now is enabled
- **THEN** it is excluded from Open now results without receiving assumed hours

#### Scenario: Incompatible fee filter
- **WHEN** a Kebab request specifies a toilet fee filter
- **THEN** the API rejects it rather than filtering food results by fees
