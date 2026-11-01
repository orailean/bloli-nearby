# Cloud logs (Grafana Cloud)

Optional export of Bloli Nearby's operational logs to Grafana Cloud Logs, with a versioned dashboard. It is off until an operator starts it, and stopping it never affects the sites, data, backups, refreshes or deployments.

## What is collected

| Service label | Source | Content |
| --- | --- | --- |
| `api` | Docker container `bloli-nearby-api` | Structured JSON events (`api_started`, `schema_migration`, `api_operation_failed`) |
| `web` | Docker container `bloli-nearby-web` | Nginx error log only; access logging stays disabled |
| `db` | Docker container `bloli-nearby-db` | PostgreSQL server log |
| `refresh` | journal, `bloli-nearby-refresh.service` | `[refresh]` outcome lines, importer stage lines and JSON events (`import_started`, `import_finished`, `schema_migration`) |
| `backup` | journal, `bloli-nearby-backup.service` | `[backup] result=…` lines |
| `deploy` | journal, identifier `bloli-nearby-deploy` | `[deploy] command=… sha=… result=…` lines from the host deploy helper |

Nothing else is read. Docker discovery is limited to the Compose project `bloli-nearby` and the services `api|web|db`; journal reading is limited to the two units and the deploy identifier. Each is also enforced by a relabel keep rule. Other applications on the VM are never forwarded. One-off importer containers are collected through the refresh unit's journal rather than Docker, so their lines are not duplicated. Imports started by hand outside the refresh unit are not collected.

Stream labels are only `app` (`bloli-nearby`), `env` (`production`) and `service`. Country, site, job ID, request ID and revision stay inside the line and are parsed at query time.

## Event format and privacy

Application events are one JSON object per line on stderr: `ts`, `level`, `service`, `event` and `revision` (the image's Git commit, baked in at build time), plus explicit fields. `src/server/log.ts` builds them, and callers pass validated identifiers only. Errors pass through `sanitizeError`, which keeps the SQLSTATE or application code, a one-line message and at most eight stack frames.

Two layers mask sensitive values:
1. **Application** (`sanitizeText`): credentials (`password=`, `token=`, `Authorization`, `Bearer`, Grafana/GitHub tokens), URL user info, query strings and fragments, IPv4/IPv6 addresses and coordinate-like decimals (four or more decimal places). Multiline text becomes one line, limited to 300 characters.
2. **Collector** (`loki.process "privacy"` in `deploy/log-collector/config.alloy`): the same masks applied to every line, including database, gateway and tool output, before it leaves the host.

The API never logs request URLs, headers or client addresses. Client errors (4xx) are not logged. An unexpected failure is logged once, with its operation (a fixed list of API paths), site, request ID and duration. The response keeps its public body `{"error":"SERVICE_UNAVAILABLE"}` and adds an `X-Request-Id` header for correlation. Imports log one start and one finish event per country, never one per feature.

## Limits and loss behaviour

| Budget | Setting |
| --- | --- |
| CPU / memory / processes | 0.25 CPU, 256 MiB, 128 PIDs (`deploy/log-collector/compose.yaml`) |
| Rate | 50 lines/s, burst 500; excess lines are **dropped** and counted (`loki_process_dropped_lines_total{reason="ratelimit_drop_stage"}`) |
| Line size | lines over 16 KiB are dropped (`reason="line_too_long"`) |
| Retry | batches of 256 KiB/5 s, backoff 1 s to 2 min, 10 retries; HTTP 429 is retried |
| Local disk | state volume `bloli-nearby-logs_alloy_data` (read positions, journal cursor only); collector log 2 × 5 MB |
| Container logs | `api`, `web` and `importer` rotate at 3 × 10 MB. `db` keeps Docker's default: changing its definition would recreate the database on the next importer run, and it writes about 80 KB/day. |

The rate cap keeps the worst case under the free plan. 50 lines/s of 300-byte lines is about 1.3 GB/day, under the free 50 GB/month. Measured volume on 2026-11-01 was far lower: about 7 KB per weekly refresh, 1.6 KB of backup output per week, about 80 KB/day of database log, and almost nothing from the API and gateway.

During a cloud outage, Alloy holds the current batch in memory and retries it. The application never waits on the collector, because the containers write to Docker's log files and the units write to the journal. If retries run out (about 10 minutes of failed attempts), that batch is lost; later lines continue from the saved read positions. A collector restart resumes from the saved positions without replaying history (journal `max_age` is 12 h). The collector never buffers on disk.

Grafana Cloud Free cannot incur charges without an explicit plan upgrade. If usage approaches the allowance (dashboard stat "Ingested (24 h)" turns yellow at 1.3 GB/day), lower the `stage.limit` rate or stop the collector.

## Setup

Prerequisites, all without secrets in Git or chat:
1. Grafana Cloud stack `jovialbean2307` (EU, `prod-eu-west-2`), Logs user `1857320`, push endpoint `https://logs-prod-012.grafana.net/loki/api/v1/push`. These are the compose defaults; override them with `LOKI_URL`/`LOKI_USERNAME` if needed.
2. In Grafana Cloud → Access Policies, create a policy for this stack with only the `logs:write` scope and a token for it. Save it on the server as `/home/oliver/stack/bloli-nearby/.secrets/grafana_logs_token` with mode `600` (for example `umask 077; cat > .secrets/grafana_logs_token`, paste, then Ctrl-D).
3. The release containing this change is deployed from `main`, and the host deploy helper is reinstalled so deployments emit journal events:
   `install -m 700 scripts/deploy-production.sh scripts/operation-lock.sh .deploy/bin/`

Start, check and stop it from the app root:

```sh
scripts/log-collector.sh up       # refuses to start without a 600-mode token
scripts/log-collector.sh status   # container, sent/dropped counters, recent collector warnings
scripts/log-collector.sh down     # stops export; keeps read positions
```

Import the dashboard manually: Grafana → Dashboards → New → Import → upload `deploy/log-collector/dashboard.json`, then choose the stack's Logs data source. The ingestion token is not needed or usable for this.

## Dashboard

`Bloli Nearby operations` (uid `bloli-nearby-ops`) has these variables: service, country, revision prefix and free-text search. Panels:
- API errors
- successful country refreshes and refresh failures (8 days)
- successful backups and backup failures (8 days)
- daily ingested bytes
- deployment failures and successful deployments (14 days)
- API errors by site
- error and failure lines
- country imports and import outcomes
- backups and deployments
- API releases and schema migrations

The 14-day retention covers two weekly refreshes, so a failed import can be compared with the previous successful one.

## Alert rules (not enabled)

No notification channel is configured, by decision of 2026-11-01. To enable alerts later, create Grafana-managed alert rules on the Logs data source with these queries, then add a contact point:

| Alert | Query | Condition |
| --- | --- | --- |
| Country refresh failed | `sum(count_over_time({app="bloli-nearby", service="refresh"} \|~ "\\[refresh\\] country=[a-z]+ result=failed" [1h]))` | > 0 |
| No successful refresh in 8 days | `sum(count_over_time({app="bloli-nearby", service="refresh"} \|= "[refresh] result=success" [8d]))` | < 1 |
| Backup failed | `sum(count_over_time({app="bloli-nearby", service="backup"} \|= "[backup] result=failed" [1h]))` | > 0 |
| No backup in 2 days | `sum(count_over_time({app="bloli-nearby", service="backup"} \|= "[backup] result=success" [2d]))` | < 1 |
| Deployment failed | `sum(count_over_time({app="bloli-nearby", service="deploy"} \|= "result=failed" [1h]))` | > 0 |
| API error burst | `sum(count_over_time({app="bloli-nearby", service="api"} \|= "api_operation_failed" [10m]))` | > 20 |
| Near free allowance | `sum(bytes_over_time({app="bloli-nearby"}[24h]))` | > 1.3e9 |

## Permissions

The collector runs as root inside its container, with every Linux capability dropped except `DAC_READ_SEARCH`, plus `no-new-privileges`, a read-only root filesystem and no published ports except loopback metrics (`127.0.0.1:12345`). It mounts the Docker socket read-only. The read-only mount only stops the socket file being replaced; it does not limit what the Docker API allows. Socket access is equivalent to root on the host, and the source restriction is configuration, not an authorization boundary. Journal files and `/etc/machine-id` are mounted read-only. `DAC_READ_SEARCH` is needed to read the token file, which is owned by `oliver` with mode 600. It allows reading regardless of file permissions but never writing, and only within the paths mounted into the container. The only writable path is the collector's own state volume.

## Rotation and removal

- **Rotate the token:** create a new token under the same access policy, overwrite `.secrets/grafana_logs_token` (mode 600), run `scripts/log-collector.sh down` then `up`, and delete the old token in Grafana Cloud.
- **Disable:** `scripts/log-collector.sh down`, then delete the token in Grafana Cloud. Application data, routing and schedules are unaffected.
- **Remove completely:** also run `docker volume rm bloli-nearby-logs_alloy_data` and delete `.secrets/grafana_logs_token`. Deleting the dashboard or the Grafana stack is a separate, explicit decision.
