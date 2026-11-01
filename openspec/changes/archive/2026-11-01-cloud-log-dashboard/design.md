## Context

Bloli Nearby serves ten hostnames from one Node API, web gateway, PostGIS database and country-aware importer on a shared Contabo VM. Other applications also run on that VM. The API currently emits a generic `api_operation_failed` message; importers emit stage text and a final JSON result. Refresh/backup services use systemd, while controlled deployment evidence lives in private local log files. Nginx access logging is deliberately disabled to avoid retaining visitor search URLs and coordinates.

The user wants a free hosted log dashboard, to be considered after the main-only GitHub Actions pipeline is checked. This change is a proposal only. No production agent, external account or credential is created by opening it.

## Goals / Non-Goals

**Goals:** Search operational errors and job outcomes from one dashboard; correlate country imports and deployments; collect only this project; preserve visitor privacy; keep bounded resource use and a free operating budget; make setup and removal repeatable.

**Non-Goals:** Implement CI/CD, ship user analytics, enable request access logs, collect other VM applications, export database contents or backup archives, replace weekly import or backup scheduling, or guarantee durable audit storage. Browser error tracking, tracing, host metrics and paid plans are separate future decisions.

## Decisions

1. **Proposed provider: Grafana Cloud Logs and Alloy.** As checked on 2026-10-30, the [Free plan](https://grafana.com/pricing/) lists 50 GB/month of logs with 14-day retention, useful for comparing weekly imports. Confirm current account limits and an appropriate region before activation. [Better Stack](https://betterstack.com/pricing) offers simpler combined monitoring but shorter free log history; [Axiom](https://axiom.co/pricing) offers longer personal-plan retention with separate storage/compute limits. Provider choice remains reviewable, not an existing account commitment.
2. **One optional collector, explicit source allowlists.** Prefer an isolated Alloy container in a production Compose override, with no public listener. Discover this project's API, web, database and one-off importer containers by exact Compose project/service labels. Collect only named refresh/backup units and approved deployment log paths. Use [Docker collection](https://grafana.com/docs/alloy/latest/monitor/monitor-docker-containers/) and supported journal/file sources as appropriate; do not assume redirected shell logs appear on container stdout. Verify Docker log-driver compatibility and socket access permissions. A read-only socket mount is not an API authorization boundary; document the access actually granted.
3. **Structured events at application boundaries.** Emit one JSON object per application event with UTC timestamp, level, service, event name and deployed revision. Add validated site, country, job/request ID, duration, result counts and sanitized error code/cause when relevant. Preserve useful sanitized stack context. Keep progress events bounded and retain existing CLI result/exit contracts so scripts continue to work. Do not emit one event per imported feature.
4. **Content versus labels.** Index only stable labels such as application, environment and service. Country/site identifiers, job/request IDs, commit hashes and error details remain structured fields unless a measured need justifies additional low-cardinality labels. Request IDs and coordinates never become stream labels.
5. **Privacy and credentials.** Use an allowlist of emitted fields and sanitized error templates. Exclude visitor IPs, precise search coordinates, query strings, authorization headers and secrets before data leaves the host. Do not enable Nginx access logs. Store a stack-scoped ingestion token outside Git, browser bundles and ordinary logs. Separate credential requirements for log ingestion from any optional dashboard-provisioning API access.
6. **Bounded, independent operation.** Persist collector read positions and use supported bounded retry/buffering with Docker/file rotation. Establish CPU, memory, local disk/age and daily ingestion budgets after measuring actual volume. Document loss behavior at saturation; cloud export must not block requests, import transactions, backups or deployment. Keep the stack on the free plan; stop/throttle collection and report quota pressure rather than silently enabling billing.
7. **Dashboard and notifications.** Version a dashboard with service/site/country/revision filters, recent errors, import outcomes/durations/counts and operational failures. Expose last-success timestamps for scheduled refreshes/backups. Define useful alert rules where free features allow, but configure recipients/channels only after the user chooses them; this proposal does not authorize test emails or messages.

## Risks / Trade-offs

- Free history is short relative to long-term incident analysis → keep deployment protocols locally and confirm that 14 days suits the user.
- Collector permissions reach a shared Docker daemon → explicitly restrict selected sources and review the chosen access method before activation.
- SQL exceptions or multiline stderr can contain data → sanitize structured application errors and filter legacy streams before forwarding, with leakage regression cases.
- Cloud outages, caps or rotation can lose logs → document bounded retries and saturation behavior, preserve local diagnostics and keep the app independent of export.
- Volume and plan limits can change → measure production ingestion, confirm current limits and establish a stop/throttle path before broad rollout.

## Migration Plan

After the main-only pipeline is verified, confirm provider/account/region, assess current Docker logging and volumes, then add structured events and disabled-by-default collector configuration. Validate filtering, restart positions and outage behavior using synthetic logs first. Deploy only from main using the verified pipeline; activate a limited source set, inspect actual usage and dashboard results, then include remaining approved sources. Record the exact sources, permissions, agent version, resource limits, dashboard identifier and verification results in an operational protocol. Removal stops/disables the collector and revokes its token without altering data volumes, public sites or schedules; dashboard removal is a separate explicit action.

## Verified Connection Details

Read from the user's signed-in Chrome Cloud Portal on 2026-10-30; no account settings or credentials were changed.

| Setting | Value |
| --- | --- |
| Stack URL | `https://jovialbean2307.grafana.net/` |
| Organization | `jovialbean2307` |
| Stack ID | `1899546` |
| Grafana Cloud region | EU Germany, `prod-eu-west-2` |
| Underlying provider/region | AWS, `eu-central-1` |
| Public Loki base URL | `https://logs-prod-012.grafana.net` |
| Loki push endpoint | `https://logs-prod-012.grafana.net/loki/api/v1/push` |
| Logs username / tenant ID | `1857320` |
| Connection details page | `https://grafana.com/orgs/jovialbean2307/hosted-logs/1857320` |

The portal showed Cloud Free as the current plan, with an initial 14-day trial of unlimited usage. Size production collection for the continuing free allowance, rather than the trial. The internal Loki data-source URL shown inside the Grafana instance is not the external push endpoint above.

## Remaining Setup Inputs / Open Questions
- An ingest-only token scoped to logs writing for that stack; preferred proposed file: `/home/oliver/stack/bloli-nearby/.secrets/grafana_logs_token`, readable only by the required deployment identity. Do not paste it into chat or commit it. Confirm the actual accepted token scope in the account UI during setup.
- Approved credential method for provisioning the dashboard, or manual dashboard JSON import; ingestion credentials are not assumed to permit dashboard administration.
- Notification preferences and whether 14-day free retention is sufficient. Start without external notifications until these are chosen.
- Confirmed CI/CD verification and current free-plan limits before activation.

## Follow-up Decisions and Inventory (2026-10-31)

- The user selected manual dashboard JSON import. Provide a versioned JSON artifact and import instructions; no dashboard administration token is required.
- Grafana's published Free plan still lists 50 GB/month ingestion and 14-day retention. Production activation must also confirm the account remains on Free after its trial.
- API, web and database containers currently use Docker `json-file` logging with empty per-container options. Explicit bounded rotation remains required; daemon defaults and actual volume still need measurement.
- Active schedules are `bloli-nearby-refresh.timer` and `bloli-nearby-backup.timer`. Backup invokes the project backup script. Inventory found the refresh service still using the legacy direct importer command; installed the repository's reviewed service definition and reloaded systemd. Its verified ExecStart now calls `scripts/update.sh`, which runs the shared-lock country refresh wrapper and released importer. The refresh timer remained active and no import was started.
- Initial byte-count sample over the last 24 hours: API 27 bytes, web 1,983 bytes, database 31,989 bytes. These are small baseline samples, not a weekly ingestion estimate: they omit completed one-off importer output and need representative refresh/deployment measurements before setting budgets.
- Run `41153636376` successfully checked, published, deployed, verified all ten public sites and finalized revision `f328596ac3e1896563198984895340e29432a840`. Task 1.1 is complete. The three GHCR packages were subsequently set to Private; anonymous manifest requests return 403 and authenticated Contabo pulls succeed.

## Implementation Decisions and Measurements (2026-11-01)

- **Retention and notifications:** the user accepted 14-day free retention, with no notifications. Alert rules are defined in `docs/deployment/cloud-logs.md` but not created.
- **Collection method:** the user chose the Docker socket over switching containers to the journald log driver. Alloy `v1.21.3` (pinned by digest) runs as the separate Compose project `bloli-nearby-logs` (`deploy/log-collector/`), so deployments never start or recreate it. It runs as root with only `DAC_READ_SEARCH` (needed for the deploy user's mode-600 token file; found in the host dry run), `no-new-privileges` and a read-only root filesystem. Its state is kept on a fresh root-owned volume path; the image's `/var/lib/alloy` belongs to uid 473 and would need `DAC_OVERRIDE`.
- **Sources:** Docker `api|web|db` of project `bloli-nearby`; the journal for `bloli-nearby-refresh.service`, `bloli-nearby-backup.service` and identifier `bloli-nearby-deploy`. The one-off importer is collected through the refresh unit's journal (`compose run` attaches its output), not Docker, which avoids duplicates and the race with `--rm`.
- **Volume measured on the host:** weekly refresh about 7 KB of journal output (the 2026-11-01 run was 5.5 KB), backup about 1.6 KB/week, database about 400 KB in 5 days, API and gateway near zero. 14 other Compose projects share the daemon. There is no `/etc/docker/daemon.json`, so container logs were unrotated. `api`, `web` and `importer` now rotate at 3 × 10 MB. `db` is deliberately left unchanged, because a changed definition would recreate the database on the next `compose run importer`.
- **Budgets:** 0.25 CPU, 256 MiB and a rate limit of 50 lines/s (burst 500). Excess lines are dropped and counted, keeping the worst case under 50 GB/month. Batches are retried in memory only.
- **Revision:** API and importer images carry `BLOLI_REVISION` from a `REVISION` build argument set by the workflow.
- **Local verification (Alloy v1.21.3 with Loki 3.5.0, synthetic containers):** only the labelled `api` container was forwarded; a `bloli-nearby` importer, an unrelated project and real local `find-a-loo`/`bloli-nearby-dev` containers were not. Masking removed the query string, IPv4/IPv6 addresses, bearer token, password, URL user info, Grafana token and coordinates. A restart resumed without replay. During a 20 s Loki outage the source container kept running, Alloy used 46 MiB, and all three lines arrived after recovery. A 3,000-line burst delivered 501 lines and counted 2,499 drops. All 14 dashboard queries ran on Loki. Journal sources need the production host and remain to be checked during activation.
