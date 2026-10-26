# Updating Find a Loo in production

Current multi-site deployment: see [Bloli Nearby migration and updates](bloli-nearby-migration.md) for both domains, category imports and preserved resource identities.

Production path: `/home/oliver/stack/bloli-nearby` on `ssh-contabo`. Public URL: https://loo.bloli.com. The existing Docker Nginx owns ports 80/443; this app publishes no host ports. The production `.env` persists `COMPOSE_FILE=compose.yaml:compose.production.yaml` so operational commands retain the external `nginx_default` network and alias `find-a-loo-web`.

## Update application code

Run on the VM:

```bash
cd /home/oliver/stack/bloli-nearby
git status --short
git rev-parse HEAD
scripts/backup.sh
git pull --ff-only origin main
scripts/compose.sh build api web importer
scripts/compose.sh up -d --wait --wait-timeout 180 api web
scripts/compose.sh ps
curl --fail --silent --show-error https://loo.bloli.com/api/ready
```

Record the old commit and backup filename before updating. Resolve any intentional local source changes before pulling; never overwrite them with a hard reset. `.env`, `.secrets`, `logs`, backups and Docker volumes are local state and ignored by Git. Keep database passwords and certificates out of commits.

Images build while the existing app continues running. The final `up` recreates only changed app services; there can be a brief application interruption during recreation. It does not replace the shared Nginx, change host port bindings, delete data volumes, or automatically download Germany data. The importer image is built for subsequent scheduled refreshes. An already-running import finishes using its existing container image.

The API applies the application's idempotent schema setup at startup. For future releases with incompatible migrations, follow that release's migration instructions and retain a pre-update backup. Check a search and the UI after readiness succeeds, not just container liveness.

## Refresh toilet/settlement data separately

```bash
sudo systemctl start find-a-loo-refresh.service
sudo journalctl -u find-a-loo-refresh.service -f
```

The systemd service allows up to six hours and uses the app's import locks. A weekly timer normally starts it Sunday around 03:15–03:45 Europe/Berlin. Avoid starting a second import during an active run. In particular, check the one-time initial import before starting another:

```bash
docker ps -a --filter name=find-a-loo-germany-import
```

For a manually attached refresh instead of systemd:

```bash
cd /home/oliver/stack/bloli-nearby
scripts/update.sh
```

Failed imports preserve the previous active dataset. Read `/api/status` for the source timestamp, counts and latest outcome. See [data storage](data-storage.md) for where the downloaded files and database actually live.

## Monitor and back up

```bash
scripts/compose.sh logs --tail 100 api web
systemctl list-timers --all find-a-loo-refresh.timer find-a-loo-backup.timer
sudo journalctl -u find-a-loo-refresh.service -n 100 --no-pager
sudo journalctl -u find-a-loo-backup.service -n 100 --no-pager
sudo systemctl start find-a-loo-backup.service
```

The daily backup timer runs around 04:30–04:45 Europe/Berlin. Dumps are in the project's `backups/` directory. Monitor disk usage and arrange secure off-host backups; this deployment does not delete older backups automatically. Back up `.env`, `.secrets/db_password`, and host `/etc/letsencrypt` securely as well. Do not publish them in Git.

## Roll back app code

Use the recorded previous commit, replacing `PREVIOUS_COMMIT` below. Keep the current database unless the code change requires a matching pre-update schema/data snapshot.

```bash
cd /home/oliver/stack/bloli-nearby
git switch --detach PREVIOUS_COMMIT
scripts/compose.sh build api web importer
scripts/compose.sh up -d --wait --wait-timeout 180 api web
curl --fail --silent --show-error https://loo.bloli.com/api/ready
```

When returning to normal updates, switch back to `main` before pulling. If a database restore is required, choose the correct pre-update dump explicitly:

```bash
scripts/restore.sh --replace-database backups/loo-TIMESTAMP.dump
```

This replaces this app's database and stops/restarts only its API and gateway, preserving the active production Compose configuration. Do not run `docker compose down -v` or delete volumes as a rollback strategy.

## If deployment files changed

Application updates normally do not require editing the shared proxy. If a release intentionally changes `deploy/nginx/loo.bloli.com.https.conf`, back up the current dedicated virtual host, copy only that file, then validate and gracefully reload:

```bash
cd /home/oliver/stack/bloli-nearby
mkdir -p backups/nginx-before-update
docker cp nginx:/etc/nginx/conf.d/loo.bloli.com.conf backups/nginx-before-update/
docker cp deploy/nginx/loo.bloli.com.https.conf nginx:/etc/nginx/conf.d/loo.bloli.com.conf
docker exec nginx nginx -t
# Only after the validation succeeds:
docker exec nginx nginx -s reload
```

If validation fails, restore the backed-up file before any reload/restart. Do not restart or replace the shared `nginx` container.

For intentional changes to this app's scheduler units:

```bash
sudo install -m 0644 deploy/systemd/find-a-loo-refresh.service deploy/systemd/find-a-loo-refresh.timer deploy/systemd/find-a-loo-backup.service deploy/systemd/find-a-loo-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl restart find-a-loo-refresh.timer find-a-loo-backup.timer
```

Certificate renewal uses the existing Snap Certbot timer and the domain-scoped hook documented in [the HTTPS setup guide](contabo-nginx.md). Verify just this lineage without touching other sites' renewal configuration:

```bash
sudo /snap/bin/certbot renew --cert-name loo.bloli.com --dry-run --run-deploy-hooks
```
