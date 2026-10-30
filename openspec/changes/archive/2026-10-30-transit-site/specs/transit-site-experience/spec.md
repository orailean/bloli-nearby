## ADDED Requirements

### Requirement: Dedicated Transit identity
Transit SHALL have an original wayfinding-inspired silver/teal/orange identity, train/bus and route artwork, compact logo/favicon, header/footer and host-specific initial HTML/canonical metadata. Motion SHALL respond briefly to actions and SHALL NOT resemble a live departure countdown or vehicle tracker.

#### Scenario: Initial Transit load
- **WHEN** transit.bloli.com loads before JavaScript initializes
- **THEN** its metadata and favicon identify Transit without another site's branding

### Requirement: Mode and radius capability-aware controls
Transit SHALL offer a validated single mode selector defaulting to All, geolocation/town/postcode search,0.5/1/2/3/5km radii with0.5km default and synchronized grouped map/list results. Transit SHALL reject fee, seller-type and Open-now parameters and hide those controls; other sites SHALL reject Transit mode parameters and retain their existing filters.

#### Scenario: User changes from bus to U-Bahn
- **WHEN** the user selects U-Bahn
- **THEN** the existing centre/radius is retained and results, mode-specific destinations and map selection update together

#### Scenario: Unsupported query on another host
- **WHEN** a Water request supplies a Transit mode filter or a Transit request supplies Open now
- **THEN** the API rejects the unsupported parameter rather than silently changing its meaning

### Requirement: Mapped transport details and honest counts
Result rows SHALL show mapped modes and nearest distance, while details SHALL identify mapped platforms/local references, network/operator/accessibility context and appropriate directions/source links. Dataset counts SHALL be labelled as stored mapped locations and nearby counts as grouped stops/stations. More line references than the display limit SHALL have explicit truncation wording.

#### Scenario: Multi-platform hub details
- **WHEN** a grouped interchange is expanded
- **THEN** individually mapped platform/local references and selected walking target are understandable without implying every platform shares identical accessibility

### Requirement: Multilingual accessible responsive experience
Transit SHALL use separate German/English/Romanian files, German fallback for unsupported browser languages and München81243 examples. All controls, long names, multi-mode badges and artwork SHALL fit320/390/430px phones and desktop without horizontal page scrolling, and SHALL support keyboard focus and reduced motion.

#### Scenario: Romanian phone search
- **WHEN** a user filters Transit on a320px phone in Romanian
- **THEN** mode/radius controls, grouped list, map and details remain readable and operable without sideways scrolling
