# Water site experience

## Purpose

Define Water presentation, shared discovery filters and accessible multilingual responsive behavior. These baseline requirements are extended by later site-category and multi-country capability specs; initial site/category counts describe the release that introduced this capability. The initial three-language interface is extended by later capabilities, including Hungarian content.

## Requirements

### Requirement: Dedicated Water presentation
Water SHALL have its own white/cobalt identity, original bottle/tap artwork, compact logo/favicon, header/footer and pre-JavaScript Water metadata. It SHALL preserve the shared discovery layout and use free bundled fonts/icons without runtime font services.

#### Scenario: Initial Water page load
- **WHEN** `water.bloli.com` is opened before JavaScript initializes
- **THEN** its title, metadata, canonical URL and favicon identify Water rather than another site

### Requirement: Shared filters and discovery behavior
Water SHALL offer All/free/paid fee filtering, mapped Open now, geolocation, town/postcode search, directions and 0.5/1/2/3/5 km radii with 0.5 km default. Unknown fees SHALL remain under All. Seller filters and cross-category overrides SHALL be rejected. Map selection, radius and results SHALL remain synchronized.

#### Scenario: Map selects a water point
- **WHEN** a user selects a result marker
- **THEN** its corresponding list item is selected and brought into view

### Requirement: Separate translations and accessible responsive motion
Water SHALL provide separate DE/EN/RO files, default unsupported browser languages to German, preserve Munich 81243 examples and fit desktop and 320/390/430 px phones without horizontal scrolling. Action-triggered ripples/fill transitions SHALL respect reduced motion and keyboard focus.

#### Scenario: Romanian phone layout
- **WHEN** a user browses Water in Romanian on a 320 px phone
- **THEN** logo, text, controls, list, map and source details remain readable and operable without sideways page scrolling
