# Cloud log collection activation — 2026-11-01

Status: active. Grafana Cloud Logs receives Bloli Nearby's operational logs. The setup and operation guide is [cloud-logs.md](cloud-logs.md). All times UTC.

## Releases

| Revision | Content | Deployment |
| --- | --- | --- |
| `97bb401` | Structured events, image revision, container log rotation, collector configuration (off) and dashboard | success, 16:54:40 |
| `a54468f` | Collector gets `DAC_READ_SEARCH` to read the mode-600 token file | success, 17:18:35 |

After `97bb401`, the API logged `schema_migration` (skipped, 15 ms) and `api_started`, both with revision `97bb4012…`. `api` and `web` run with json-file rotation of 3 × 10 MB. The host deploy helper was reinstalled from `97bb401` (sha256 prefix `79915d8e1abbd160`). The `a54468f` deployment was the first to write `[deploy]` journal events (`started`, `host_verified` after 206 s, finalize `success`).

## Stack and sources

| Setting | Value |
| --- | --- |
| Stack | `jovialbean2307` (EU, `prod-eu-west-2`), Logs user `1857320` |
| Push endpoint | `https://logs-prod-012.grafana.net/loki/api/v1/push` |
| Credential | access-policy token with `logs:write`, in `.secrets/grafana_logs_token` (mode 600, not recorded here) |
| Collector | `grafana/alloy:v1.21.3@sha256:8ab87120…`, Compose project `bloli-nearby-logs` |
| Docker sources | project `bloli-nearby`, services `api`, `web`, `db` |
| Journal sources | `bloli-nearby-refresh.service`, `bloli-nearby-backup.service`, identifier `bloli-nearby-deploy` |
| Labels | `app=bloli-nearby`, `env=production`, `service`; journal streams also carry `job` |
| Dashboard | `deploy/log-collector/dashboard.json`, imported manually on the `grafanacloud-jovialbean2307-logs` data source |

## Verification

1. **Local** (Alloy with Loki 3.5.0 and synthetic containers): source exclusion, masking, restart without replay, outage recovery and rate limiting all passed. All 14 dashboard queries ran on Loki. See the change's design notes.
2. **Host dry run** (real configuration and sources, sent to a temporary local Loki, nothing exported):
   - The first start failed: root without capabilities could not open the deploy user's mode-600 token file. Fixed in `a54468f` by allowing `DAC_READ_SEARCH` instead of loosening the file's permissions.
   - After the fix, all six sources arrived: 316 lines, 19 KB for the last 12 hours.
   - A scan of every line found no unmasked IPv4 addresses, coordinates, query strings or credentials.
   - Alloy used 63 MiB. A test journal line `[deploy] command=activation-check sha=none result=test` checked the deploy identifier and was later exported once.
   - The dry-run containers, volume and Loki image were removed.
3. **First activation** (17:18): every push was rejected with `401 invalid token`. A direct test showed the saved credential was not an access-policy token. The collector was stopped after about a minute. Nothing was delivered, so its read positions were reset.
4. **Activation** (about 17:35): the replacement `glc_` token was tested first with an empty push (HTTP 204), then the collector started.
   - First 75 seconds: 790 lines and 69 KB sent, with no write errors.
   - 60 MiB memory and 2% CPU.
   - On startup the rate cap (burst 500, then 50 lines/s) dropped 1,871 backlog lines. Most came from 2,380 lines of database log written since that container started on 2026-10-27, read all at once on first start. Some of the 264 refresh/backup journal lines from the preceding 12 hours may also have been dropped. Steady-state volume is far below the cap.

## Follow-up changes

- `scripts/log-collector.sh up` now strips whitespace from the token file, keeping mode 600, because Alloy sends the file verbatim and its configuration cannot trim secrets.
- No alert rules or notification channels are configured (decision of 2026-11-01). Candidate rules are listed in the guide.
