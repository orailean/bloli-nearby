## MODIFIED Requirements

### Requirement: Safe complete six-category publication
Charge SHALL participate in shared source/completion validation, independent minimum/count-drop checks and atomic publication with every category required by the deployed registry, settlements and Transit context. During ATM/Stay expansion the required complete set SHALL contain all eight categories. Geometry preflight SHALL exercise all required feature kinds. Failed preparation or validation SHALL retain prior active data. Publication success and later maintenance/readiness failures SHALL be distinguishable. Existing six-category snapshots SHALL remain readable during additive migration, but a six-category importer SHALL not overwrite an expanded country snapshot.

#### Scenario: Incomplete expanded import fails safely
- **WHEN** geometry, completion, a required category or minimum counts fail
- **THEN** no partial eight-category country dataset becomes active

#### Scenario: Existing sites preserved during expansion
- **WHEN** a candidate expanded import fails
- **THEN** all six existing category counts/source timestamps remain unchanged and Transit grouping context remains usable
