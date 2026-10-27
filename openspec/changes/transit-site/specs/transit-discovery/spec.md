## ADDED Requirements

### Requirement: Mapped passenger and fixed mobility locations
Transit SHALL include active mapped passenger stations/stops for rail, U-Bahn, S-Bahn, tram/light rail, bus/trolleybus, taxi, ferry, cable/funicular and other supported rail. Private/inactive/freight-only features, infrastructure paths, offices, bike/scooter/car-sharing locations and airport/aircraft facilities SHALL NOT qualify. Missing facts SHALL remain unknown.

#### Scenario: Legacy and modern bus stops
- **WHEN** a source contains a legacy bus_stop and a public_transport platform with bus evidence
- **THEN** both qualify for bus discovery subject to access/lifecycle checks and explicit grouping

#### Scenario: Cargo and inactive places
- **WHEN** a source contains a freight-only station, disused platform or taxi company office
- **THEN** none qualifies as an active passenger boarding location

### Requirement: Evidence-based multiple transport modes
A location SHALL support multiple source-backed modes, with explicit negative mode tags overriding inferred relation context. S-Bahn SHALL require documented service evidence and SHALL NOT be inferred from light_rail or a name alone. Unresolved mode details SHALL retain a supported broader mode or Other.

#### Scenario: Light rail is distinct from S-Bahn
- **WHEN** a light-rail station has no mapped S-Bahn service evidence
- **THEN** it is discoverable as light rail without a fabricated S-Bahn badge

#### Scenario: Multi-mode passenger interchange
- **WHEN** a station has explicit U-Bahn and S-Bahn service evidence
- **THEN** both modes are preserved and the station can match either mode filter

### Requirement: Explicit grouping before result limits
Transit SHALL group related features using unambiguous source-backed direct stop_area membership, preserving raw identities and distinct unrelated same-name stops. Eligibility by selected mode, access and radius SHALL be applied to components before grouping, distance ordering and the100-result cap. Grouped responses SHALL expose stable logical identity, selected component and distance provenance.

#### Scenario: Platform is in range while station centre is outside
- **WHEN** an eligible selected-mode platform lies inside the radius but the station centre is outside
- **THEN** the station is returned at that eligible component's distance and map/list coordinates

#### Scenario: Duplicate station components and unrelated stops
- **WHEN** a station/platform/stopping-position share a direct stop_area, while another same-name stop has no such relationship
- **THEN** the related features appear as one logical result and the unrelated stop stays distinct

#### Scenario: Grouping does not consume the cap with components
- **WHEN** many nearby component records belong to a few interchanges
- **THEN** the100-result cap and truncation indicator count logical results rather than duplicate components

### Requirement: Passenger-facing directions targets
Mapped usable mode-related public entrances SHALL be eligible for radius inclusion and nearest distance alongside passenger platforms. Transit SHALL use the nearest eligible passenger-facing point consistently for displayed distance, marker and walking target and disclose approximate normal station/legacy-stop destinations. Vehicle stop_positions SHALL NOT become duplicate passenger destinations. A stop_position-only reference SHALL be labelled approximate and SHALL NOT offer a walking link onto the vehicle track/road point.

#### Scenario: Entrance is inside the radius while platforms are outside
- **WHEN** an explicitly related usable entrance for the selected mode is inside500m and platforms are outside500m
- **THEN** the station qualifies with distance, marker and directions using that entrance

#### Scenario: Only a train stopping position is mapped
- **WHEN** no related passenger-facing station/platform/access point is available
- **THEN** the reference is disclosed as approximate without an invented safe boarding location or walking link

### Requirement: Source context remains descriptive
Transit SHALL preserve mapped network/operator, line/local references, access hours and accessibility details with their provenance. It SHALL NOT infer departure times, delays, fares, taxi availability, service frequency, direction from route endpoints or whole-station accessibility from one member.

#### Scenario: Facility has access hours but no timetable
- **WHEN** a station has mapped building hours and route references
- **THEN** details show those facts without an Open now service claim or upcoming departure

### Requirement: Atomic five-category publication and bounded enrichment
The importer SHALL publish Transit locations, memberships/context and all other active categories atomically, with independent Transit count validation and completion checks. Route metadata SHALL NOT be published as point locations or require recursively importing national route path geometry. Failure SHALL retain all active category and grouping data.

#### Scenario: Replacement omits Transit context or an active category
- **WHEN** an incomplete fifth-category refresh is attempted
- **THEN** publication fails and previous locations, groups and other categories remain coherent and usable
