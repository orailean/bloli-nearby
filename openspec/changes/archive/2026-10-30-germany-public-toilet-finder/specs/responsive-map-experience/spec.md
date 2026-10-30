## ADDED Requirements

### Requirement: German English and Romanian interface
The app SHALL provide its complete interface in German, English, and Romanian, including accessible labels, filters, facility field labels, unknown values, directions, validation and loading/empty/error states. It MUST offer a visible language selector, update the document language, use locale-aware formatting, and bundle translations locally. Source names, raw hours and free-text notes MUST remain as supplied unless a localized source value exists.

#### Scenario: Initial language selection
- **WHEN** the app starts without a saved supported language
- **THEN** it uses the first supported browser language, matching regional variants, or German if none matches

#### Scenario: Persist explicit choice
- **WHEN** the user selects Română and later reloads with browser storage available
- **THEN** the app remains in Romanian regardless of browser language preferences

#### Scenario: Switch without losing search state
- **WHEN** the user switches between German, English, and Romanian
- **THEN** interface text and formatting update while location, filters, selected result and map position remain unchanged

#### Scenario: Browser storage unavailable
- **WHEN** the user switches language but local storage is unavailable
- **THEN** the selected language works for the current session without breaking the app

#### Scenario: Translation completeness
- **WHEN** translation dictionaries are checked before release
- **THEN** all three locales contain the required interface keys, including error and accessibility messages

### Requirement: Responsive accessible map and list
The system SHALL provide a mobile map with expandable results and a desktop map beside results. Controls MUST have accessible names, visible keyboard focus, and textual fee labels. Map and list selection MUST stay synchronized and attribution MUST remain visible.

#### Scenario: Select a facility
- **WHEN** the user selects a result card or map marker
- **THEN** the matching facility is selected in both views and its details are accessible

#### Scenario: Narrow screen and keyboard use
- **WHEN** the app is used at a 360 CSS-pixel viewport or with a keyboard
- **THEN** core search, filtering, result selection, and directions remain available without horizontal page scrolling

### Requirement: Recoverable UI states
The app SHALL distinguish loading, empty results, API failure, tile failure, and stale dataset states and retain useful independent functionality.

#### Scenario: Map tiles unavailable
- **WHEN** tile loading fails but facility search succeeds
- **THEN** the user can still browse results, inspect details, and open directions

### Requirement: External walking directions
The system SHALL open Google Maps walking directions to the selected toilet using a Maps URL without an API key. It MUST NOT load Google Maps scripts during normal use or include the user's location in the directions URL.

#### Scenario: Open directions
- **WHEN** the user chooses walking directions
- **THEN** Google Maps opens with the facility coordinates as destination and walking travel mode, allowing Google Maps to determine the origin
