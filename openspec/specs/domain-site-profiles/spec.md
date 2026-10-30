# Domain site profiles

## Purpose

Define host-selected site identity, shared interactions and distinct responsive multilingual content. These baseline requirements are extended by later site-category and multi-country capability specs; initial site/category counts describe the release that introduced this capability. The initial three-language interface is extended by later capabilities, including Hungarian content.

## Requirements

### Requirement: Hostname selects a consistent site
The system SHALL serve Loo on loo.bloli.com and Kippe on kippe.bloli.com through shared application services. Initial HTML metadata, frontend identity and API category SHALL agree for the resolved host. Unknown production hosts and cross-site category overrides MUST be rejected.

#### Scenario: Two hosts share infrastructure
- **WHEN** clients request each configured hostname
- **THEN** each receives its own title, canonical URL, branding and category while using the shared gateway/API/database

#### Scenario: Unrecognized host or category override
- **WHEN** a request uses an unconfigured production host or tries to override the host's category
- **THEN** the server returns a clear error without silently selecting another site

### Requirement: Distinct designs use shared interactions
The sites SHALL share search, map/list synchronization, radius choices, directions and accessible navigation, while providing separate themes, artwork, copy, filters and location details. Loo SHALL retain its existing identity and WC behavior. Kippe SHALL present tobacco purchase locations rather than WC terminology or fee controls.

#### Scenario: Kippe controls
- **WHEN** a user visits Kippe
- **THEN** the site presents its own design and seller-type controls without toilet free/paid filters

#### Scenario: WC regression protection
- **WHEN** a user visits Loo after the platform migration
- **THEN** existing price/Open now filters, radius-dependent zoom, natural mobile scrolling and marker selection remain usable

### Requirement: Separate multilingual content
Shared and site-specific translation content SHALL live in separate DE/EN/RO JSON files. Supported browser preferences and saved choices SHALL be respected, with German fallback. Site identity SHALL remain unchanged when switching language.

#### Scenario: Romanian Kippe visit
- **WHEN** a user selects Romanian on Kippe
- **THEN** copy, controls, details and accessible labels are Romanian and no Loo-specific copy appears

### Requirement: Responsive layout and motion
Both sites SHALL fit phone screens without horizontal page scrolling or artwork obscuring text, and SHALL honor reduced-motion preferences.

#### Scenario: Small translated phone layout
- **WHEN** either site is viewed at widths from 320 to 430 pixels in any supported language
- **THEN** headline letters and controls remain readable, results remain reachable and the page fits the viewport
