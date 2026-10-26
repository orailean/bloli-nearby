# Bloli Nearby migration protocol — 2026-10-26

## Authorization and baseline

The owner approved the Bloli Nearby platform/repository name, the two-domain shared design, tobacco sellers beyond machines, and implementation/deployment of OpenSpec change `bloli-nearby-multi-site`. Existing no-binaries-in-Git, separate DE/EN/RO dictionaries, native local debugging and VM protocol requirements remain in force.

- Original application commit: `d5aa33b2f67c4ffb7d37c020073607fc645b7509`.
- VM: `vmd34296`, `oliver@173.212.194.159`; original checkout `/home/oliver/stack/find-a-loo`, target `/home/oliver/stack/bloli-nearby`.
- Existing Compose project: `find-a-loo`; containers API/web/DB healthy; only container-internal 3100/80/5432 ports.
- Existing persistent volumes verified: `find-a-loo_postgres_data` and `find-a-loo_import_data`, under `/var/lib/docker/volumes/<name>/_data`.
- Current WC snapshot: 25,954 facilities and 196,951 settlement/postcode records, source `germany-261025.osm.pbf`, dated `2026-10-25T21:21:21Z`. Retained PBF checksum recorded as `1a2bd3665c3e2507e1da99befd2ac228`.
- Kippe DNS A resolves to `173.212.194.159`; no AAAA answer at preflight.
- Shared Docker Nginx remains running; current config backup saved as `backups/nginx-before-bloli-nearby-20261026/`.
- Pre-migration DB backup created: `backups/loo-20261026T210316Z.dump`.

## Implementation and verification

- Added generic OSM identities/category memberships and per-category metadata through additive schema changes; legacy WC tables remain transactionally maintained for rollback.
- Implemented explicit host profiles, generic category-scoped discovery, seller-type filters and conservative evidence-based retailer normalization. Customer-only access is preserved. Once tobacco data is active, partial WC-only refreshes are rejected to avoid mixed shared geometry/settlement snapshots.
- Extended Python filtering/extraction for machines, tobacco shops and explicitly tagged tobacco-selling shops/petrol stations, retaining multi-category identities and strict fixed-location geometry checks.
- Created shared frontend modules, separate common/site JSON dictionaries and distinct Loo/Kippe artwork/themes, HTML metadata and favicons. Preserved 0.5-km default, five radius choices, Open now, map/list interactions and natural phone scrolling.
- One read-only source scan launched as `bloli-tobacco-distribution`, with outputs in `logs/tobacco-distribution.{py,json,err}`; no duplicate Germany download.
- Unit checks passed (24); isolated PostGIS integration checks passed (11), including category/host isolation, repeat imports, failed snapshots and partial-refresh rejection. Python checks passed (14). Integrated browser checks passed (22), plus agent-run Chromium/WebKit checks for both sites and all locales. TypeScript/production build and generated site shells passed.
- Built an isolated local Compose stack `bloli-nearby-smoke` on loopback port 18088. Verified both host-specific initial HTML identities/canonical URLs, Kippe API profile and HTTP 421 for unknown host. Original development database remains separate.
- Seeded disposable native sample DB `bloli_sample_check`: 6 toilets, 8 sellers and 2 settlements. Dumped/restored into `bloli_restore_check`; both category counts survived. No synthetic sample records are imported into production.
- Added explicit production external-volume bindings and preserved Compose identity; added generic gateway alias while retaining legacy alias. New backup/refresh units use the target canonical path. Added Kippe bootstrap/HTTPS config and a renewal deploy hook scoped to both domains.

## Repository rename

- GitHub CLI had no authenticated identity; Chrome was signed into the work account. At the owner's direction used Firefox, already authenticated to personal `orailean`, to rename the repository to `orailean/bloli-nearby`.
- Updated repository About description to “Bloli Nearby: shared OpenStreetMap discovery for Find a Loo and Kippe — public toilets, cigarette machines and mapped tobacco sellers across Germany.” Verified the saved description in the browser.
- Local remote changed to `git@github.com:orailean/bloli-nearby.git` and SSH access verified. README/package metadata and current operator guides now use the umbrella name. Historical protocols retain original names.

## Remaining rollout steps

Rename VM checkout/remotes and timer paths, pin/reuse source for combined import, install Kippe TLS/renewal, deploy shared build/API, verify public sites and counts, record final backup/status, and rename the local checkout after active work completes. Append actual results below; this section does not claim those steps are complete.

## Actual rollout

- Implementation commit `3430e5b` pushed to the renamed repository, including the Bloli Nearby README.
- Disabled the legacy `find-a-loo-{refresh,backup}.timer` pair, moved the VM checkout to `/home/oliver/stack/bloli-nearby`, updated its remote and pulled the new implementation. Verified Compose identity stays `find-a-loo` and existing volume bindings remain intact. `.env`, secrets, backups and logs moved with the checkout.
- Built API/web/importer on the VM (`logs/build-bloli-nearby.log`), deployed API/web with health checks and retained the existing DB container. Additive backfill preserved all 25,954 WC records and original source metadata. Kippe correctly reported not ready until its new import finishes.
- Installed/verified/enabled new `bloli-nearby-{backup,refresh}` units using the new working directory; old timer pair stays disabled. No new host application ports were published. Gateway has both generic and legacy aliases on `nginx_default`.
- Started `bloli-nearby-germany-import` with the retained dated source URL. Log confirms `[checksum] Reusing verified source: /data/source.osm.pbf`; filtering includes both categories. No second full Germany download was needed.
- Installed Kippe HTTP bootstrap in shared Nginx, verified a public ACME challenge and issued `/etc/letsencrypt/live/kippe.bloli.com/` certificate through existing Snap Certbot/account/webroot; expiry 2027-01-24. Installed final HTTPS virtual host and validated/gracefully reloaded Nginx, leaving unrelated configurations running.
- Installed executable `/etc/letsencrypt/renewal-hooks/deploy/50-bloli-nearby-nginx-reload` for both domains. Moved the old Loo-only hook into project backups to avoid duplicate reloads. Domain-specific renewal dry runs are in progress and logs are kept in the project.
- Stopped the isolated local Compose smoke stack after verification, preserving disposable volumes. Sample backup/restore rehearsal retained 6 WC and 8 seller records.

- Both certificate renewal simulations succeeded with deploy hooks. The first dry run entered Certbot's normal 369-second random delay; stopped only that test process and reran both tests using `--no-random-sleep-on-renew`. Automatic timer configuration was not changed. Logs: `certbot-kippe-renewal-dry-run.log` and `certbot-loo-multisite-renewal-dry-run.log`.
- At the owner's explicit request, production service names are changing to `bloli-nearby-web`, `bloli-nearby-api` and `bloli-nearby-db`, with matching production Compose declarations. Running containers can be renamed in place during import; data volumes and service DNS aliases are unchanged. The legacy Compose project identity remains pinned solely for migration/resource tracking.

- Owner also requested generic database/login names. Prepared configurable connection options (default `DB_NAME=bloli_nearby`, `DB_USER=bloli`), updated health/backup/restore commands and added a controlled SQL rename script. The existing password is reused; rename will run only after the active combined import finishes and a fresh backup is verified. New connection-option regressions and all 26 unit checks passed; production build passed.

- Combined Germany publication completed successfully: **25,954 toilets**, **31,018 tobacco sellers**, **196,951 settlements**. Source checksum-verified reuse succeeded; the expanded filtered extract was about 52 MiB. No WC count was lost.
- Rehearsed the database/login rename in disposable `bloli-rename-rehearsal`: retained a test row and ownership, authenticated as `bloli` to `bloli_nearby` using the unchanged password, then dropped the temporary local administrator and removed the rehearsal container. Production rename remains pending its fresh backup/build.
- Added exact systemd timer/service paths, weekly/daily schedules, status/log/manual trigger commands and schedule-change instructions to the migration guide at the owner's request.

- Full-source diagnostic was stopped after filtering became available: helper exit 137 with `OOMKilled=false`. A replacement read-only filtered-extract measurement completed in 138.9 seconds: candidates 28,900 machines/2,113 shops/8 fuel stations; final normalized published category 28,898/2,112/8 = 31,018. Baseline JSON saved under project logs; future production `MIN_SELLERS=15000` is based on this measurement, plus the existing 0.75 previous-snapshot guard.
- Preserved successful combined-import logs as `logs/import-germany-multisite-success.log`, final distribution as `logs/tobacco-distribution-final.json`, and stopped-helper logs. Removed both exited main/diagnostic containers after confirming the main job exited 0 and neither had OOM. No exited containers remained at that check.
- Both public sites passed live category/metadata/search/filter/image/mobile checks before database rename; evidence `/tmp/bloli-production-before-db-rename.json` locally will be copied into the project logs.

- Owner requested machines default to 24/7. Implemented a labelled assumption only when source hours are absent; explicit mapped schedules remain authoritative. Existing records receive the presentation/query-time default without altering raw tags.
- Owner approved broader petrol-station coverage after the original evidence-only filter showed no Munich results: all active mapped fuel stations are now eligible, with translated unconfirmed-sales labels when tobacco evidence is absent. Explicit tobacco=no and private/inactive features remain excluded. This changes the extraction filter and needs one more retained-source pass, without a new download.
- Updated classifier/Python tests and category integration fixtures. Verification passed: 28 unit/operations tests, 14 Python tests, 11 PostGIS integration tests and four targeted responsive Kippe browser tests, plus production build.

- Restore now uses `--no-owner` so pre-rename archives do not require the deleted legacy role; restored objects are owned by the configured shared login.

- Owner identified inconsistent old/generic proxy upstream references. Replaced both HTTPS vhosts' duplicated location blocks with `include /etc/nginx/conf.d/bloli-nearby-proxy.inc`, using `$bloli_upstream` and `http://bloli-nearby-web:80`. Removed the legacy alias from the declared production configuration; the common include is installed before validating/reloading both vhosts.

- Applied the rehearsed production rename after confirming no importer remained and verifying `backups/bloli-nearby-20261026T212414Z.dump`. Stopped app readers/timers, used a temporary local migration role, renamed database `loo` to `bloli_nearby` and role `loo` to `bloli`, retained the verified SCRAM password and ownership, then dropped the temporary role. Verified only `bloli` remains among old/new/migration role names.
- VM `.env` now selects `DB_USER=bloli`, `DB_NAME=bloli_nearby`, `MIN_SELLERS=15000`. Recreated shared DB/API/web with explicit generic names and configurable health/connections; all healthy. Counts remained 25,954 toilets and 31,018 sellers. Both public sites passed live browser/API checks after reconnecting; old source data remained available during the next refresh.
- New backup service ran successfully against the renamed database (`Result=success`, `ExecMainStatus=0`), producing `backups/bloli-nearby-20261026T213431Z.dump`. Started `bloli-nearby-germany-fuel-import` with generic importer image/settings and the retained dated source to include unconfirmed petrol stations.
- Installed the common Nginx proxy include and both corrected virtual hosts on the VM, validated configuration and gracefully reloaded. Both hosts route through the same generic upstream; public site identities remained correct. No unrelated service/proxy container restart was performed.

- Renamed the local checkout from `/Users/oliver.raileanu/_work/private/github/orailean/find-a-loo` to `/Users/oliver.raileanu/_work/private/github/orailean/bloli-nearby` after local browser checks finished. Verified Git status clean, origin points to `orailean/bloli-nearby`, and OpenSpec resolves the renamed planning home. Final source commands run from the new directory.
- Verified the deployed Open now query returns machines with `openingHours=24/7` and `hoursAssumed=true` where source hours are absent. Generic container/image names are now consistent; the new fuel-import container also uses `bloli-nearby-importer:latest`.

### Final expanded import and local development cleanup

- Expanded fuel-inclusive import completed with exit 0: 25,954 toilets, 48,514 sellers, 196,951 settlements; source PBF reused, filtered file approximately 54 MiB. Saved `logs/germany-fuel-import.log`, then removed the exited importer container.
- Final VM backup: `backups/bloli-nearby-20261026T215026Z.dump`.
- Renamed local development database/login to `bloli_nearby_dev` / `bloli_dev`, integration database to `bloli_nearby_integration`, and Docker project/container/volume to generic Bloli Nearby names. Preserved existing password and verified the 246-toilet sample. Old local volume retained for rollback; private SQL backup is outside Git.
- Owner’s final petrol-station policy: assume cigarette sales and omit special sales labels in list/details; source evidence remains internal and explicit negative tags still exclude stations.

### Final deployment verification

- Deployed source commit `8fa5895` by rebuilding shared API/web and running `docker compose up -d --wait api web`. All three app containers healthy; database remains shared. No exited containers remained on the VM.
- Fresh checks: 28 unit/operations tests, 11 real PostGIS integration checks, production build and 8 dual-site desktop/phone browser checks passed. Restarted stale local native processes from the renamed checkout; verified the generic local development DB with existing sample data.
- Final public-domain browser/API verification passed for both HTTPS domains: correct metadata/categories, real map images, Munich results for all seller types including fuel, no petrol-station sales label in list/details, directions, radius, Open now and DE/EN/RO layouts at 320/390/430px without horizontal overflow. Evidence saved to VM `logs/verification-final.json`.
- Both new refresh/backup timers active. Completed importer removed after log preservation. Source data/backup files remain outside Git; only source and documentation are committed. Rollback guidance remains in `bloli-nearby-migration.md`.
