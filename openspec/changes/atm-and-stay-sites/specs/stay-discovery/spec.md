## ADDED Requirements

### Requirement: Explicit accommodation types
Stay SHALL include active mapped hotels, motels, guesthouses, hostels, apartments, chalets/holiday homes, campsites and caravan/motorhome sites. It SHALL exclude private/prohibited/inactive sites, generic residences, individual camping pitches and unrelated tourism objects. Customer/guest access SHALL be valid. Source identities SHALL remain stable.

#### Scenario: Generic residential building
- **WHEN** a building has no accepted accommodation evidence
- **THEN** it is not included based on its name or residential use alone

#### Scenario: Camping site and pitches
- **WHEN** a campsite and its individual pitches are mapped
- **THEN** the campsite is eligible and the individual pitches are not independent Stay results

### Requirement: Accommodation filtering and details
Stay SHALL default to all accepted types and support explicit type filtering before nearest ordering, limits and truncation. It SHALL display mapped contact/website, operator, address, classification stars, rooms/capacity and amenities when available. Missing information SHALL remain unknown; stars SHALL not be represented as reviews. Links SHALL accept safe HTTP(S) URLs only. Other hosts SHALL reject accommodation-specific filters.

#### Scenario: No mapped classification
- **WHEN** a hotel lacks stars
- **THEN** no star rating is invented or used to exclude it from default results

### Requirement: Honest availability and reception semantics
Stay SHALL distinguish reception hours, general opening hours and check-in/out details from room availability. It SHALL offer neither an Open now filter nor a free/paid accommodation filter. It SHALL provide contact/website actions and a concise availability note without inventing current prices or inventory. Its default Google Maps route SHALL use driving mode.

#### Scenario: Reception closed
- **WHEN** a reception schedule indicates closed
- **THEN** the property remains discoverable and is not labelled unavailable for accommodation on that basis
