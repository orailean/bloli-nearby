# Weekly refresh failure and deploy outage — 2026-11-01

Status: resolved. All fixes released (`af3357e`, finalized 14:03:36); the follow-up refresh succeeded for all four countries at 15:35:40 and the failure banner is gone. All times UTC.

## Summary

The first scheduled weekly refresh since multi-country coverage (2026-10-28) failed for every country, so all eleven sites showed "Die letzte Aktualisierung ist fehlgeschlagen. Der vorherige Datenstand wird weiter genutzt." No country published; every site kept serving its previous snapshot. Three independent defects, all predating Vend, caused the failures. Fixing the third caused a 2½-minute outage of all sites during deployment because the API health check had no startup grace period.

| Defect | Affected | Fix |
| --- | --- | --- |
| Invalid postal-code polygon without fallback crashed the extractor | DE | `79234ed` |
| Same-version conflict check rejected ways whose nodes moved | RO, AT, HU | `79234ed` |
| Importer startup migration deadlocked against live API reads | RO, AT (manual rerun) | `c50329a` |
| API health check failed during a long first-start migration; web never started | all sites, deploy | `af3357e` |

Related: the Vend rollout of 2026-10-31 hit and fixed a separate extractor defect (`type=node` vending relations, `cc6017e`); see the [Vend protocol](protocol-2026-10-31-vend.md).

## Timeline

| Time | Event |
| --- | --- |
| 02:23:38 | `bloli-nearby-refresh.service` starts the weekly refresh (DE → RO → AT → HU). |
| 05:24:07 | DE fails: `RuntimeError: invalid area (area_id=2223747)`. |
| 05:36:16 | RO fails: `OSM_VERSION_CONFLICT`. |
| 06:00:33 | AT fails: `OSM_VERSION_CONFLICT`. |
| 06:13:10 | HU fails: `OSM_VERSION_CONFLICT`. Service exits failed; all sites show the failure banner. |
| 10:14–10:18 | Unrelated Vend gate release `6110f59` deploys successfully. |
| 10:28–10:31 | `79234ed` (extractor and conflict fixes) deploys successfully. |
| 10:32:31 | Manual refresh started via `systemctl start --no-block bloli-nearby-refresh.service`. |
| 11:29:32 | DE succeeds; skips two invalid postal relations (1111873, 1111878). |
| 11:31:02 | RO fails within 90s: `deadlock detected` (40P01) in `migrate()`. |
| 11:32:21 | AT fails the same way. |
| 11:40:28 | HU succeeds. |
| 12:01:02 | `c50329a` (migration fix) deployment starts; old API/web containers are replaced. |
| 12:02:22 | Deployment finalizes as `failure`: web container left in `Created`. All sites return 502. |
| 12:02:24 | API finishes the first-start migration (`schema_state.applied_at`) and becomes healthy. |
| 12:03:26 | `docker start bloli-nearby-web`; all eleven sites return 200. |
| afterwards | `check-multi-site-production.mjs` passes for all eleven sites against `c50329a`. `af3357e` pushed. |
| 12:16:04 | `af3357e` deployment starts; API skips the unchanged schema, api and web healthy, host verification passes. |
| 12:18:43 | Workflow's `finalize … success` SSH connection is dropped by sshd (`MaxStartups` throttling); job fails, release left `pending`. |
| 14:03:36 | After an independent eleven-site browser check, `af3357e` finalized as `success` on the host with the workflow's own command. |
| 14:03:51 | Follow-up refresh started. |
| 15:08:59 | DE succeeds. |
| 15:16:09 | RO succeeds (no deadlock). |
| 15:28:50 | AT succeeds (no deadlock). |
| 15:35:40 | HU succeeds; service finishes. Every site and country reports the latest refresh as `success`. |

## Defect 1 — DE: invalid postal boundary crashed the extractor

The 2026-10-31 Germany extract contains relation 1111873 (`boundary=postal_code`, 63457 Hanau) whose outer ring cannot be assembled. In `importer/extract.py` `area()`, `create_multipolygon` raised, no fallback point existed, and the handler re-raised the `RuntimeError`, aborting the extraction three hours in.

Missing settlement/postal geometry is already tolerated by design and reported as `skippedSettlementGeometries`; only category geometries are required. The fix leaves such an area uncompleted and logs `[geometry] Invalid … polygon without fallback geometry`. Category objects still abort through the existing `Incomplete … geometries` completeness checks. Regression test: `test_invalid_postal_boundary_without_fallback_is_a_skipped_settlement` reproduces the production error with an unclosed outer ring (same `area_id=2223747`).

## Defect 2 — RO/AT/HU: false `OSM_VERSION_CONFLICT`

`importDataset` rejects a snapshot when an object has the same OSM version as the stored row but different tags or geometry. OSM does not increment a way's or relation's version when only its member nodes move, so a building nudged by a few metres keeps its version while its computed point shifts.

A read-only comparison of the fresh extracts against the database found only such cases: RO 7 ways, AT 13 ways and 1 relation, HU 4 ways — no nodes, no tag differences. The fix compares geometry only for `node/` identities, whose coordinates are part of their version; tags are still compared for every object. The integration test publishes a same-version way twice with a moved point (accepted, location updated) and a same-version node with a moved point (still `OSM_VERSION_CONFLICT`).

## Defect 3 — migration deadlock at importer start

Every importer process calls `migrate()`, which ran all of `schema.sql`. Its `ALTER TABLE … DROP/ADD CONSTRAINT` and `ADD COLUMN IF NOT EXISTS` statements take `ACCESS EXCLUSIVE` locks and run in one implicit transaction. API status/readiness queries — including the container health checks — read `country_datasets` and `location_categories` in the opposite order. Postgres reported: migration waits for `AccessExclusiveLock` on `country_datasets` held by an API reader, which waits for `AccessShareLock` on `location_categories` held by the migration. DE's migration won the race by chance; RO and AT lost.

The fix records the SHA-256 of `schema.sql` in a new `schema_state` table after a successful run and skips the script when it matches. Every data statement in the script is a one-time upgrade backfill (`ON CONFLICT DO NOTHING` / `IS NULL` guards), so skipping unchanged starts loses nothing; it also stops re-running the German membership backfill on every start. A run that does execute retries up to five times on `40P01`, which is safe because the whole script rolls back. Unit tests cover the call order, the skip, and retry-on-deadlock-only; the PostGIS backfill test now clears `schema_state` to simulate a pre-country installation. Verified on PostGIS that a second `migrate()` leaves `applied_at` unchanged.

## Defect 4 — deploy outage from the API health check

`c50329a` changed `schema.sql`, so the new API ran the full migration before listening: 80 seconds (12:01:04 → 12:02:24). The API health check (`interval: 15s`, `retries: 5`, no `start_period`) marked it unhealthy after about 75 seconds. `web` depends on `api: service_healthy`, so Compose never started it, `up --wait` failed and the deployment finalized as `failure`. The release script correctly does not restore the database on this failure, but the old web container had already been replaced, leaving all sites at 502.

Recovery: the already-created web container from the same release was started manually at 12:03:26. `c50329a` contains no web changes. All eleven sites returned 200 and the full production browser check passed.

Fix `af3357e`: `start_period: 150s` on the API health check, within the deployment's 180s `--wait-timeout`. Because unchanged schemas are now skipped, ordinary deployments no longer migrate at API start at all.

## Release and backup records

| Release | Deployment | Pre-deploy backup |
| --- | --- | --- |
| `79234ed` | success, 10:31:46 | `backups/bloli-nearby-20261101T102547Z.dump` |
| `c50329a` | failure, 12:02:22 (running after manual web start) | `backups/bloli-nearby-20261101T115848Z.dump` |
| `af3357e` | success, 14:03:36 (finalized manually after the runner's SSH was dropped) | `backups/bloli-nearby-20261101T121350Z.dump` |

`af3357e` reconciled `.deploy/current.json` with the running containers after the unrecorded `c50329a` state.

## Finalize connection dropped by SSH throttling

The `af3357e` workflow failed in its finalize step with `kex_exchange_identification: read: Connection reset by peer`. The host log shows `beginning MaxStartups throttling` at 12:18:43 and `drop connection #10 from [20.84.158.23]` (the GitHub-hosted runner): sshd's default `MaxStartups 10:30:100` randomly drops new connections while ten unauthenticated ones are pending, and the host receives continuous password brute-forcing (over 6,000 failed logins on 2026-11-01). The deployment itself was complete and verified; it was finalized manually with `.deploy/bin/deploy-production.sh finalize <sha> success` after the browser check passed. Any workflow SSH step (deploy, finalize) can hit this.

Fix (committed with this protocol): the workflow retries `registry-login` and `finalize … success` up to five times with backoff, only on SSH exit 255 (connection failure). The deploy step itself is never repeated.

## Validation

58 Python extractor checks, 118 unit checks and 17 PostGIS integration checks pass; TypeScript and Compose configuration validate.

## Refresh results

| Country | Weekly (02:23) | Manual (10:32) | Follow-up (14:03) |
| --- | --- | --- | --- |
| DE | failed (invalid area) | success | success, 15:08:59 |
| RO | failed (version conflict) | failed (deadlock) | success, 15:16:09 |
| AT | failed (version conflict) | failed (deadlock) | success, 15:28:50 |
| HU | failed (version conflict) | success | success, 15:35:40 |

Germany's vending count is 116,730. `/api/status` reports `latestJob.status=success` for all eleven sites in all four countries, so the failure banner no longer renders.

## Follow-ups

- Harden SSH against the brute-force load that throttles deployments: disable password authentication and/or add fail2ban. The workflow retry only works around it.
- The extractor and the conflict check had never run against a week-newer source since multi-country coverage. Consider a staging measurement against fresh sources before the weekly timer when import code changes.
