# Water discovery

## Purpose

Define explicit potable-water eligibility, conservative mapped facts, seasonal hours and safe publication. These baseline requirements are extended by later site-category and multi-country capability specs; initial site/category counts describe the release that introduced this capability.

## Requirements

### Requirement: Explicit mapped potable-water evidence
The system SHALL include accessible active fixed features explicitly mapped as drinking-water points, drinking fountains, potable-water providers or refill partners. Explicit negative/uncertain potability, legal non-potability, inactive lifecycle or restricted access SHALL override positive evidence. Generic fountains, taps and springs without potable-water evidence SHALL NOT qualify.

#### Scenario: Decorative fountain and potable fountain
- **WHEN** two mapped fountains differ only in explicit potable-water evidence
- **THEN** only the explicitly potable fountain qualifies for Water

#### Scenario: Contradictory water tags
- **WHEN** `amenity=drinking_water` is combined with `drinking_water=no` or `drinking_water:legal=no`
- **THEN** the feature is excluded

#### Scenario: Refill partner access
- **WHEN** an active establishment explicitly has `drinking_water:refill=yes` and `access=customers`
- **THEN** it qualifies as a refill partner with customer access disclosed

### Requirement: Water-specific facts and unknown values
Water records SHALL preserve mapped type, fee, bottle suitability, seasonality, refill network, access and hours. Water-specific fees/hours SHALL take precedence; an unrelated venue entrance fee SHALL NOT be presented as the water fee. Missing facts SHALL remain unknown and SHALL NOT imply free access, bottle suitability or 24/7 operation.

#### Scenario: Refill partner has venue fee only
- **WHEN** a refill establishment has `fee=yes` but no mapped water-specific fee
- **THEN** its water fee remains unknown

### Requirement: Conservative seasonal Open now
Water Open now SHALL use mapped schedules without applying vending-machine defaults. A seasonal feature without an explicit annual/month schedule SHALL remain unconfirmed for Open now, even if daily hours are present. Displayed status SHALL describe mapped hours rather than live water operation.

#### Scenario: Seasonal fountain in winter
- **WHEN** `seasonal=yes` is combined with daily hours and no annual/month schedule
- **THEN** the fountain is not returned as confirmed open by Open now

### Requirement: Safe four-category publication
The importer SHALL extract Water using existing validated geometry/source handling and atomically publish it alongside toilets, tobacco, kebab and settlements. All four categories SHALL be required after Water activates. Independent Water floors/drop checks and failure retention SHALL apply.

#### Scenario: Later refresh omits Water
- **WHEN** a replacement snapshot omits the already-active Water category
- **THEN** publication fails and every active category retains its previous data

#### Scenario: Same source adds a fourth category
- **WHEN** a verified retained Germany source is reprocessed to add Water
- **THEN** existing three-category counts and source identities remain consistent with that same source
