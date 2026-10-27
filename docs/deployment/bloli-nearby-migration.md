# Bloli Nearby production migration and updates

The public sites are `loo.bloli.com` (Find a Loo), `kippe.bloli.com` (Kippe) and `kebab.bloli.com` (Kebab). All three share one gateway/frontend, API, PostGIS and scheduled Germany importer. The canonical checkout is `/home/oliver/stack/bloli-nearby` and source is `git@github.com:orailean/bloli-nearby.git`.

## Current resource identities

Running service containers are **`bloli-nearby-web`**, **`bloli-nearby-api`** and **`bloli-nearby-db`**. The production Compose override uses project **`bloli-nearby`** and explicitly attaches the external volumes **`bloli-nearby_postgres_data`** and **`bloli-nearby_import_data`**. These are verified copies of the original data resources; the offline rename is recorded in the Kebab protocol and volume migration guide. The shared database is `bloli_nearby`, login role `bloli`; the existing password secret is reused. API/importer connections and backup/restore/health commands use configurable `DB_NAME`/`DB_USER` rather than fixed legacy names. The gateway uses `bloli-nearby-web` on `nginx_default`. All three public virtual hosts include the same `bloli-nearby-proxy.inc` location block, so upstream/header/timeout settings cannot diverge. Install this `.inc` beside the virtual hosts in the shared Nginx configuration volume. No new host ports are published. Never rename the checkout/project without verifying these bindings: Docker could otherwise create an empty replacement DB.

```bash
cd /home/oliver/stack/bloli-nearby
docker compose config --quiet
docker volume inspect bloli-nearby_postgres_data bloli-nearby_import_data --format '{{.Name}} {{.Mountpoint}}'
docker compose ps
```

The VM `.env` selects `COMPOSE_FILE=compose.yaml:compose.production.yaml`. The base Compose project name is `bloli-nearby`; the override binds explicitly named external data volumes. Development PostGIS uses project `bloli-nearby-dev`, database `bloli_nearby_dev`, role `bloli_dev` and volume `bloli-nearby-dev-postgres-data`; see the local development guide.

## Deployment sequence

1. Record Git commit, running images, volume mounts, WC counts, source URL/checksum, Nginx virtual hosts and active timers. Run `scripts/backup.sh` and verify the dump with `pg_restore --list` before schema changes.
2. Rename the GitHub repository/remotes. Move the single production checkout to the canonical path, preserving `.env`, `.secrets`, `backups`, `logs` and `.git`; keep the production Compose identity pinned. Update timers to the new path and disable the legacy timer pair before enabling the replacement pair.
3. Build API/web/importer. The additive schema backfills existing WC memberships and retains legacy tables for rollback. Existing WCs remain ready; Kippe stays not ready until a successful combined import.
4. For the first combined import, pin the retained dated source rather than a moving latest URL:

```bash
docker compose --profile tools run -d --name bloli-nearby-germany-import \
  -e DATA_URL=https://download.geofabrik.de/europe/germany-261025.osm.pbf importer
docker logs -f bloli-nearby-germany-import
```

The checksum-verified 4.6 GB PBF is reused; the expanded filter is regenerated. `MIN_FACILITIES`, `MIN_SETTLEMENTS`, `MIN_SELLERS` and `MIN_IMPORT_RATIO` validate staging before atomic publication. A bad seller extract cannot erase active WC data. After Kippe activation, WC-only refreshes are rejected to prevent mixing shared geometry/settlements from different snapshots.

5. Verify Kippe DNS points to this VM and has no conflicting AAAA record. Install the HTTP bootstrap from `deploy/nginx/kippe.bloli.com.http.conf` in the shared Nginx config volume, validate `docker exec nginx nginx -t`, gracefully reload and verify an external webroot challenge. Issue a certificate through existing Certbot/account/webroot, then install the HTTPS file and validate/reload again. Existing Loo TLS stays intact. Never recreate shared Nginx.
6. Install `deploy/letsencrypt/50-bloli-nearby-nginx-reload` as an executable deploy hook for both domains, replacing the prior domain-only hook. Run domain-specific renewal dry runs with deploy hooks. Install/enable only the new `bloli-nearby-{refresh,backup}.timer` pair from `deploy/systemd`.
7. Deploy with `docker compose up -d --wait api web`, verify both domains' metadata, `/api/site`, readiness, searches, seller/fee/Open now filters, images and phone layouts. Save all actual operations/results in a dated deployment protocol and take a post-migration backup.

## Subsequent app updates

```bash
cd /home/oliver/stack/bloli-nearby
scripts/backup.sh
git rev-parse HEAD # save rollback commit
git pull --ff-only
docker compose build api web
docker compose up -d --wait api web
```

Verify **all three** public domains. `/api/health` is liveness; `/api/ready` and `/api/status` are category-aware using the request hostname. `npm run build` generates separate initial HTML metadata for each site while sharing versioned assets. Unknown production hosts and cross-category overrides are rejected.

Dataset refresh is separate: build the importer when its code changes, then use `scripts/update.sh` or let the weekly timer run. The scheduled job resolves one latest verified Germany snapshot for all categories. Monitor job outcomes per site and save logs. Backup/restore includes locations, category memberships/metadata, legacy toilets, settlements and import jobs.

## Rollback

Record and use the pre-migration commit/configuration. Stop only this app's API/web, restore the previous app images/checkouts/proxy aliases/timer paths, validate/reload Nginx and verify Loo. Legacy WC tables are maintained transactionally alongside generic data during the transition. If schema/data restoration is needed, use the verified pre-migration custom-format backup through the documented restore script. Preserve both named volumes. Do not run `down -v` or delete volumes during rollback. The shared Nginx and unrelated services remain running.

Downloaded source/staging remains under `/var/lib/docker/volumes/bloli-nearby_import_data/_data`; PostgreSQL files remain in `/var/lib/docker/volumes/bloli-nearby_postgres_data/_data`. Neither moves when the checkout is renamed. Logs and backups move with the project directory and remain ignored by Git.

## Database/role rename

Wait for the combined import to exit successfully; back up the completed dataset. Build the configurable API/importer images first. Stop only app readers, use a temporary passwordless **local-socket-only** migration superuser to run `deploy/postgres/rename-shared-database.sql`, then connect as `bloli` and drop that temporary role. The SQL renames the database/role (retaining object ownership by role OID) and verifies/retains the existing SCRAM password hash without exposing it in shell output. Update VM `.env` to `DB_USER=bloli` and `DB_NAME=bloli_nearby`, then recreate the shared services with health checks. Verify both categories and restart scheduled operations only after success. Do not rename while an import holds connections. Record exact operations/results in the migration protocol.

Rollback of the rename uses the same controlled connection shutdown, temporary local administrator and `ALTER DATABASE bloli_nearby RENAME TO loo` / `ALTER ROLE bloli RENAME TO loo`, reusing the password secret and restoring prior connection configuration. Persistent volume paths do not change.

## Automatic updates on the VM

Location data updates are scheduled by **systemd**, through these files:

- `/etc/systemd/system/bloli-nearby-refresh.timer`: Sundays at **03:15 Europe/Berlin**, with up to **30 minutes random delay**; persistent timers catch missed runs after downtime.
- `/etc/systemd/system/bloli-nearby-refresh.service`: runs `/usr/bin/docker compose --profile tools run --rm importer` as `oliver`, working directory `/home/oliver/stack/bloli-nearby`.
- `/etc/systemd/system/bloli-nearby-backup.timer`: daily at **04:30 Europe/Berlin**, with up to **15 minutes random delay**; invokes the companion backup service/script.

The old `find-a-loo-refresh.timer` and `find-a-loo-backup.timer` are disabled. There must be only one active refresh/backup pair. The weekly importer updates toilets, tobacco sellers, kebab places and shared settlements from a single verified Germany source. Visible map tiles continue loading directly in users' browsers; the job does not download raster map tiles.

Inspect schedules, exact configuration and refresh history:

```bash
systemctl list-timers --all bloli-nearby-refresh.timer bloli-nearby-backup.timer
systemctl cat bloli-nearby-refresh.timer bloli-nearby-refresh.service
systemctl status bloli-nearby-refresh.timer
journalctl -u bloli-nearby-refresh.service --since '7 days ago'
```

Run a refresh manually through the same service (this may download a newer Germany snapshot and take several minutes):

```bash
sudo systemctl start bloli-nearby-refresh.service
journalctl -u bloli-nearby-refresh.service -f
```

Or run `scripts/update.sh` from the canonical project checkout. The advisory lock prevents overlapping imports; a rejected concurrent run is not a second updater. Check service exit status and both domains' `/api/status` after a run. Failed publication preserves the previous active data.

To change the schedule, edit the timer or add a systemd override, then run `sudo systemctl daemon-reload` and `sudo systemctl restart bloli-nearby-refresh.timer`; verify the next activation with `list-timers`. Preserve a single active timer and document any operational schedule change.

The restore script uses `pg_restore --no-owner` so archives created under the legacy role can be restored under the configured current login, without requiring the old role to exist. Objects become owned by the restoring app role; backup contents and categories are otherwise preserved.

The third-site additive migration, DNS/TLS configuration and three-category rollback constraints are documented in [Kebab deployment](kebab-site.md). After Kebab activation, older two-category importers must not replace the shared snapshot.

The one-time resource rename to generic volume/project names is documented in [volume migration](volume-name-migration.md). Historical commands above describe the earlier migration sequence; use the current identities for subsequent updates.
