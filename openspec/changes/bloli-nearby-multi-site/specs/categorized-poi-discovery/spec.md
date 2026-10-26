## ADDED Requirements

### Requirement: Category-aware identities and readiness
The database SHALL share OSM source identities, spatial infrastructure and settlements while storing distinct category memberships and category-specific attributes. Dataset status, validation counts and readiness SHALL identify the relevant category.

#### Scenario: A petrol station has public toilets and tobacco sales
- **WHEN** one OSM object qualifies for both categories
- **THEN** both memberships survive repeat imports with correct site-specific attributes and no duplicate membership

#### Scenario: A new category is not imported
- **WHEN** toilets are ready but tobacco sellers have no successful publication
- **THEN** Loo remains ready while Kippe reports its missing dataset rather than a misleading empty successful search

### Requirement: Evidence-based tobacco purchase locations
Kippe SHALL include cigarette vending machines, tobacco shops and retail shops explicitly mapped as selling tobacco, and mapped petrol stations. Stations lacking tobacco-sales evidence SHALL be treated as cigarette sellers by the application, without a special sales label; stations explicitly tagged not selling tobacco SHALL be excluded. It SHALL NOT infer sales solely from a generic non-fuel shop classification or a business name. Negative sales evidence, inactive lifecycle state and inaccessible venues MUST be handled conservatively. Results SHALL distinguish machine, shop and petrol station and identify mapped information as unverified stock/availability.

#### Scenario: Mixed-product machine
- **WHEN** a vending machine's semicolon-separated vending tag contains cigarettes
- **THEN** it is eligible for the machine category unless inactive or inaccessible

#### Scenario: Explicit retail evidence
- **WHEN** a shop or petrol station has supported positive tobacco-sales tags
- **THEN** it is eligible with the corresponding seller type and source provenance

#### Scenario: Untagged fuel station
- **WHEN** a petrol station lacks explicit tobacco-sales evidence
- **THEN** it is included as a petrol station with no special tobacco-sales label

### Requirement: Site-scoped discovery and filters
Discovery SHALL constrain category, seller-type or WC fee filters, radius and distance ordering before returning at most 100 matching results with truncation metadata. Radius choices SHALL be 0.5, 1, 2, 3 and 5 km, with 0.5 km default and 5 km maximum. Unsupported category filters MUST fail validation. Open now SHALL use recorded schedules in Europe/Berlin and exclude missing/uncertain schedules before limiting results, except machines with missing hours SHALL default to explicitly labelled assumed 24/7. Explicit mapped hours SHALL take precedence.

#### Scenario: Nearby wrong-category objects
- **WHEN** a Kippe search has many closer toilets and some eligible sellers
- **THEN** only eligible sellers contribute to the ordered results and truncation count

#### Scenario: Seller-type filter
- **WHEN** the user selects machines, shops or petrol stations
- **THEN** both list and map show only that type within the chosen radius

### Requirement: Shared source with safe publication
The importer SHALL reuse the verified retained Germany snapshot for the initial extension import, extract all supported categories and settlements, validate per-category thresholds and publish a coherent dataset transactionally. A failed extraction or publication MUST preserve the previous active data. New filter expressions MUST invalidate older filtered staging.

#### Scenario: Existing source reuse
- **WHEN** the recorded dated Germany PBF passes its integrity check
- **THEN** the initial extension import reprocesses it without downloading another full Germany file

#### Scenario: Invalid seller extract
- **WHEN** the staged seller category fails geometry or count validation
- **THEN** the importer reports failure and leaves the active WC and seller snapshots unchanged

### Requirement: Category-appropriate information
Kippe SHALL display mapped seller type, name, operator/brand, payment methods, hours/access, directions and provenance where available; missing information SHALL be marked unknown. The interface MUST NOT equate a mapped tobacco seller with guaranteed current cigarette stock or assume machines are always accessible.

#### Scenario: Missing hours and payment tags
- **WHEN** a machine lacks those tags
- **THEN** its details identify assumed 24/7 hours and unknown payment, and Open now includes it unless an explicit schedule or access restriction overrides the default
