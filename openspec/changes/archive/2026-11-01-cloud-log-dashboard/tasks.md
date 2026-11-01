## 1. Prerequisites and Scope

- [x] 1.1 Verify the GitHub Actions pipeline, including CI checks, main-only production deployment and a successful controlled deployment; record its revision before implementing collection.
- [x] 1.2 Confirm Grafana Cloud/provider choice, account region, current free limits and desired retention; record stack URL, Loki push endpoint and Logs username/tenant ID without secrets.
- [x] 1.3 Inventory this project's Docker log drivers, one-off importer behavior, refresh/backup units and deployment log paths; measure representative log volume and select explicit sources.
- [x] 1.4 Provision a stack-scoped ingestion credential in the server secrets directory and choose manual dashboard import or separately scoped provisioning access; document rotation without exposing values.

## 2. Structured Events and Privacy

- [x] 2.1 Add regression cases for diagnostic API errors, import outcomes and leakage of coordinates, query strings, visitor IPs and credentials, including multiline exceptions.
- [x] 2.2 Implement shared structured event formatting and safe API error context with validated identifiers/revision, preserving public error responses.
- [x] 2.3 Add bounded job-stage and operational completion events for imports, refreshes, backups and deployments while preserving exit codes, CLI result contracts and backup safeguards.
- [x] 2.4 Verify the failure/success events and privacy filters using synthetic input and existing application checks.

## 3. Collector and Dashboard

- [x] 3.1 Add a version-pinned, disabled-by-default Alloy/collector production override with explicit project/service/unit/path allowlists, secrets mounts and reviewed Docker/journal permissions.
- [x] 3.2 Configure stream parsing, sanitization, stable labels, persistent read positions and bounded resource/retry/rotation/ingestion budgets; document saturation/loss behavior.
- [x] 3.3 Verify unrelated-service exclusion, completed importer collection, restart behavior, cloud-outage isolation and quota throttle/stop behavior without exporting live visitor data.
- [x] 3.4 Add a versioned dashboard with error search, country/job/revision correlation, import outcomes and operational last-success/failure views; define alert rules and request recipient preferences before enabling notifications.

## 4. Controlled Activation and Handoff

- [x] 4.1 Deploy the reviewed configuration from main through the verified pipeline; enable a limited approved source set and verify delivery, masking, dashboard queries and usage against the free budget.
- [x] 4.2 Include the remaining approved sources only after the limited rollout passes; confirm collection does not block application requests, jobs or deployment checks.
- [x] 4.3 Document setup inputs, permissions, resource/usage limits, queries, credentials rotation, disable/removal steps and any alert channels selected by the user.
- [x] 4.4 Record deployed revisions, dashboard/stack identifiers, actual source allowlists and verification outcomes in a production protocol without tokens or sensitive log samples.
