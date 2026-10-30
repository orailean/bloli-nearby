# Kebab site experience

## Purpose

Define Kebab identity, translations, shared accessible interactions and honest mapped venue details. These baseline requirements are extended by later site-category and multi-country capability specs; initial site/category counts describe the release that introduced this capability. The initial three-language interface is extended by later capabilities, including Hungarian content.

## Requirements

### Requirement: Distinct Kebab identity
The site SHALL present a subject-specific Kebab wordmark, artwork, header/footer and coherent visual theme while preserving shared discovery interactions. Initial HTML SHALL contain Kebab metadata, canonical URL, favicon and site identity without a Loo/Kippe branding flash. The final visual direction MUST receive owner review before implementation.

#### Scenario: Initial public HTML
- **WHEN** a user requests kebab.bloli.com before JavaScript runs
- **THEN** the response identifies Kebab with its own canonical URL, metadata and favicon

### Requirement: Separate multilingual content
Kebab SHALL provide separate German, English and Romanian site translation files, sharing common interface translations where appropriate. Saved language preferences SHALL persist per host, and unsupported browser languages SHALL default to German. Food copy SHALL not reuse toilet or tobacco-specific labels.

#### Scenario: Unsupported browser language
- **WHEN** a new user opens Kebab with only unsupported browser language preferences
- **THEN** the interface defaults to German

### Requirement: Responsive shared search and selection
The interface SHALL retain synchronized radius bounds, map/list selection, directions, keyboard navigation and natural phone scrolling. Content MUST fit 320 px and wider phone screens in every supported language without horizontal scrolling. Motion SHALL respect reduced-motion preferences and SHALL not obscure controls or letters.

#### Scenario: Radius change on a phone
- **WHEN** a phone user changes the search radius
- **THEN** the result query, visible list, boundary and map framing update consistently

#### Scenario: Select a map marker
- **WHEN** a user selects a kebab marker
- **THEN** its corresponding result is selected and brought into view without scrolling the entire desktop layout unexpectedly

### Requirement: Honest mapped venue details
Details SHALL show mapped hours, access and useful payment/takeaway/delivery/dietary fields where available, keeping absent information unknown. Website/menu links MUST accept only safe HTTP(S) destinations. The site SHALL NOT invent prices, ratings, menus, halal status or current availability.

#### Scenario: No mapped dietary information
- **WHEN** a kebab venue has no halal or vegan tags
- **THEN** the interface does not infer either property from cuisine or name
