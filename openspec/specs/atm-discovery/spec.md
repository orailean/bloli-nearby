# ATM discovery

## Purpose

This capability describes eligibility, mapped properties, filtering, hours and directions for ATM discovery.

## Requirements

### Requirement: Explicit ATM evidence
The system SHALL include active standalone `amenity=atm` objects and fixed establishments explicitly marked `atm=yes`. It SHALL exclude banks without ATM evidence, hosts marked `atm=separate`, explicitly unavailable withdrawals, private/prohibited/inactive features and unevaluable conditional restrictions. Customer-only access SHALL be disclosed. It SHALL preserve source identities and distinguish establishment-level coordinates from precise machine mapping without proximity deduplication.

#### Scenario: Bank without a mapped ATM
- **WHEN** a bank has no affirmative ATM evidence
- **THEN** it is absent from ATM results

#### Scenario: Separately mapped machine
- **WHEN** an establishment has `atm=separate` and a standalone machine is mapped
- **THEN** the machine is a candidate and the host is not a duplicate candidate

### Requirement: Conservative ATM properties and filters
The system SHALL preserve mapped ATM operator/network, currencies, withdrawal/deposit services, access, wheelchair, fees and hours without inferring missing values or treating unrelated host fees/operator as machine properties. Currency, deposit and mapped-fee filters SHALL apply before nearest ordering, limits and truncation. Unknown values SHALL remain included under default All filters and SHALL not satisfy explicit affirmative filters. ATM parameters SHALL be rejected on other sites.

#### Scenario: Unknown deposit support
- **WHEN** the user requests deposit-capable ATMs
- **THEN** a machine with unknown deposit support is excluded without being classified as deposit=no

#### Scenario: Unrelated host fee
- **WHEN** an ATM is mapped inside a fee-bearing establishment without ATM fee evidence
- **THEN** the establishment fee is not advertised as the ATM withdrawal fee

### Requirement: Mapped access hours and directions
ATM Open now SHALL evaluate mapped access hours in the physical country's timezone and SHALL exclude unknown/unresolvable schedules. Missing machine hours SHALL not imply 24/7. ATM directions SHALL use walking mode. Fee text SHALL not promise that a visitor's bank/card issuer charges nothing.

#### Scenario: Missing hours
- **WHEN** a machine has no usable mapped access schedule and Open now is selected
- **THEN** it is excluded from that filtered result
