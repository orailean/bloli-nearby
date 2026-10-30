# Charge site experience

## Purpose

This capability defines the accessible, multilingual user experience for discovering and navigating to mapped EV charging stations.

## Requirements

### Requirement: Distinct accessible Charge identity

Charge SHALL have original charging-post/cable artwork, a distinct light cobalt/coral visual identity, responsive header/footer and free bundled icons/fonts while preserving the shared map/list interaction family. Interaction-driven cable/socket transitions SHALL respect reduced motion and SHALL NOT imply live charging status. Layout SHALL fit320px screens and long localized copy without horizontal overflow or artwork covering text.

#### Scenario: Phone layout remains readable
- **WHEN** Charge is viewed at320px in German or Romanian
- **THEN** branding, controls, map, natural-scrolling results and footer fit the viewport without overlap or horizontal scrolling

#### Scenario: Reduced motion is respected
- **WHEN** reduced motion is enabled and a search or connector selection changes
- **THEN** results update with visible focus/state feedback without cable travel/bounce effects

### Requirement: Separate multilingual charging content

Charge SHALL provide separate DE/EN/RO translation files, German unsupported-language fallback, persistent explicit language choice and München/81243 examples. Labels SHALL distinguish mapped access hours, connector count, maximum mapped power, unknown details and customer restrictions from live availability.

#### Scenario: Unknown facts stay unknown in each locale
- **WHEN** a station lacks power, access or fee information
- **THEN** each supported language presents an unknown state rather than free/public/available claims

### Requirement: Charging discovery interactions

Charge SHALL preserve0.5/1/2/3/5km radii with0.5km default, map radius fitting, city/location search, result ordering, map/list selection synchronization and truncation indicators. Connector/power/access/fee/hours controls SHALL be keyboard-operable and labelled, and changes SHALL refresh the same search origin without stale requests overwriting newer results.

#### Scenario: Rapid filter changes keep the latest choice
- **WHEN** the user changes connector and radius while earlier requests remain in flight
- **THEN** the final list, map bounds and markers correspond to the current controls

### Requirement: Useful details and driving directions

Charge SHALL show mapped connector/power/count, access, operator/network, capacity, charging/parking fee and payment/authentication/hour details with source-date context. It SHALL offer driving directions to the mapped station location without inventing an entrance, embedding the search origin or altering existing sites' walking links. Unsupported website protocols SHALL NOT become clickable links.

#### Scenario: Directions remain site-specific
- **WHEN** a user opens directions from Charge and from Transit
- **THEN** Charge opens driving directions and Transit retains walking directions to its eligible mapped component

#### Scenario: Mapped specifications are not availability
- **WHEN** details display four sockets and150kW
- **THEN** the wording describes mapped hardware and maximum output without claiming four free sockets or a working charger
