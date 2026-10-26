# Bloli Nearby production migration and updates

The public sites are `loo.bloli.com` (Find a Loo) and `kippe.bloli.com` (Kippe). Both share one gateway/frontend, API, PostGIS and scheduled Germany importer. The canonical checkout is `/home/oliver/stack/bloli-nearby` and source is `git@github.com:orailean/bloli-nearby.git`.

## Resource identities that deliberately stay unchanged

Running service containers are **`bloli-nearby-web`**, **`bloli-nearby-api`** and **`bloli-nearby-db`**. The production Compose override pins project **`find-a-loo`** and explicitly attaches the external volumes **`find-a-loo_postgres_data`** and **`find-a-loo_import_data`**. These are existing data resources, not application branding. Database role/database `loo` and the secret file are retained. The gateway adds `bloli-nearby-web` on `nginx_default` and retains `find-a-loo-web` for old proxy configuration. No new host ports are published. Never rename the checkout/project without verifying these bindings: Docker could otherwise create an empty replacement DB.

```bash
cd /home/oliver/stack/bloli-nearby
docker compose config --quiet
docker volume inspect find-a-loo_postgres_data find-a-loo_import_data --format '{{.Name}} {{.Mountpoint}}'
docker compose ps
```

The VM `.env` selects `COMPOSE_FILE=compose.yaml:compose.production.yaml`. The base Compose project name is `bloli-nearby`; the override preserves the migration identity. Development PostGIS intentionally retains its existing `find-a-loo-dev` identity/volume.

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

Verify **both** public domains. `/api/health` is liveness; `/api/ready` and `/api/status` are category-aware using the request hostname. `npm run build` generates separate initial HTML metadata for each site while sharing versioned assets. Unknown production hosts and cross-category overrides are rejected.

Dataset refresh is separate: build the importer when its code changes, then use `scripts/update.sh` or let the weekly timer run. The scheduled job resolves one latest verified Germany snapshot for all categories. Monitor job outcomes per site and save logs. Backup/restore includes locations, category memberships/metadata, legacy toilets, settlements and import jobs.

## Rollback

Record and use the pre-migration commit/configuration. Stop only this app's API/web, restore the previous app images/checkouts/proxy aliases/timer paths, validate/reload Nginx and verify Loo. Legacy WC tables are maintained transactionally alongside generic data during the transition. If schema/data restoration is needed, use the verified pre-migration custom-format backup through the documented restore script. Preserve both named volumes. Do not run `down -v` or delete volumes during rollback. The shared Nginx and unrelated services remain running.

Downloaded source/staging remains under `/var/lib/docker/volumes/find-a-loo_import_data/_data`; PostgreSQL files remain in `/var/lib/docker/volumes/find-a-loo_postgres_data/_data`. Neither moves when the checkout is renamed. Logs and backups move with the project directory and remain ignored by Git.
