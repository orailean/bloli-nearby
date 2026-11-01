## Why

Production errors and multi-country import outcomes currently require SSH access and scattered Docker, systemd and rollout logs. A searchable cloud dashboard would make failures easier to investigate and compare across weekly runs without running a log database on Contabo.

## What Changes

- Propose Grafana Cloud Logs with one Grafana Alloy collector for this project's containers and selected refresh/backup/deployment logs; confirm the provider and free account limits before activation.
- Add structured, sanitized API and job events with useful failure causes, durations, country/site identifiers and deployed revision.
- Provide a saved dashboard for errors, import outcomes and operational failures, with explicit source filtering, bounded local storage and ingestion-volume monitoring.
- Document credentials, provisioning, verification, quota handling and removal. Keep cloud credentials outside Git and out of browser assets.
- Schedule implementation after the main-only GitHub Actions pipeline has been checked and verified. This proposal does not implement that pipeline or enable log export.

## Capabilities

### New Capabilities

- `structured-operational-logs`: Consistent, privacy-preserving application and job events for diagnosis and release correlation.
- `cloud-log-collection`: Project-scoped collection, cloud search/dashboard, bounded operation and documented deployment lifecycle.

### Modified Capabilities

None. Discovery APIs, site features, data publication guarantees and existing backup retention requirements remain unchanged.

## Impact

- Node API error handling, importer/refresh result logging, and operational script/service outcomes.
- Optional production Compose collector configuration, collector state/credentials and dashboard definitions; possible systemd log permissions.
- One external cloud account and ingestion credentials, to be supplied during implementation. No account creation, paid subscription or production changes are authorized by this proposal alone.
- All ten websites share the same backend, so collection is deployed once for Bloli Nearby, rather than once per hostname. Other applications on the shared VM are outside scope.
