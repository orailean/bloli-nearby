# Updating Bloli Nearby in production

Current ten-site deployment: see [View and Sights](view-sights-sites.md) and its [rollout protocol](protocol-2026-10-30-view-sights.md). Earlier eight-site rollout: [ATM and Stay](atm-stay-sites.md). Existing operations: see [Bloli Nearby migration and updates](bloli-nearby-migration.md), [multi-country operations](multi-country-coverage.md), [Water setup](water-site.md), [Transit setup](transit-site.md) and [Charge setup](charge-site.md).

Production path: `/home/oliver/stack/bloli-nearby` on `ssh-contabo`. Public sites: https://loo.bloli.com, https://kippe.bloli.com, https://kebab.bloli.com, https://water.bloli.com, https://transit.bloli.com, https://charge.bloli.com, https://atm.bloli.com, https://stay.bloli.com, https://view.bloli.com and https://sights.bloli.com. The existing Docker Nginx owns ports 80/443; this app publishes no host ports. The production `.env` persists `COMPOSE_FILE=compose.yaml:compose.production.yaml` so operational commands retain the external `nginx_default` network and alias `bloli-nearby-web`.

## Update application code

Run on the VM:

```bash
cd /home/oliver/stack/bloli-nearby
git status --short
git rev-parse HEAD
scripts/backup.sh
umask 022 # build inputs must remain readable; keep secrets/backups private
git pull --ff-only origin main
scripts/compose.sh build api web importer
scripts/compose.sh up -d --wait --wait-timeout 180 api web
scripts/compose.sh ps
curl --fail --silent --show-error https://loo.bloli.com/api/ready
```

Record the old commit and backup filename before updating. Resolve any intentional local source changes before pulling; never overwrite them with a hard reset. `.env`, `.secrets`, `logs`, backups and Docker volumes are local state and ignored by Git. Keep database passwords and certificates out of commits.

Images build while the existing app continues running. The final `up` recreates only changed app services; there can be a brief application interruption during recreation. It does not replace the shared Nginx, change host port bindings, delete data volumes, or automatically download Germany data. The importer image is built for subsequent scheduled refreshes. An already-running import finishes using its existing container image.

The API applies the application's idempotent schema setup at startup. For future releases with incompatible migrations, follow that release's migration instructions and retain a pre-update backup. Check a search and the UI after readiness succeeds, not just container liveness.

## Refresh all category and settlement data separately

```bash
sudo systemctl start bloli-nearby-refresh.service
sudo journalctl -u bloli-nearby-refresh.service -f
```

The systemd service allows up to six hours and uses the app's import locks. A weekly timer normally starts it Sunday around 03:15–03:45 Europe/Berlin. Avoid starting a second import during an active run. In particular, check the one-time initial import before starting another:

```bash
docker ps -a --filter label=com.docker.compose.service=importer
```

For a manually attached refresh instead of systemd:

```bash
cd /home/oliver/stack/bloli-nearby
scripts/update.sh
```

Failed imports preserve the previous active country snapshot. `scripts/update.sh` refreshes active countries sequentially, records a separate result for each, continues after failures, then exits nonzero if any country failed. Read `/api/status` for every country's activation state, source timestamp, counts and latest outcome. Retry one country with `scripts/refresh-countries.sh ro` (or `at`, `hu`, `de`). Pending countries are skipped by the scheduled job. See [multi-country operations](multi-country-coverage.md) for measured floors and activation gates, and [data storage](data-storage.md) for the country cache paths.

## Monitor and back up

```bash
scripts/compose.sh logs --tail 100 api web
systemctl list-timers --all bloli-nearby-refresh.timer bloli-nearby-backup.timer
sudo journalctl -u bloli-nearby-refresh.service -n 100 --no-pager
sudo journalctl -u bloli-nearby-backup.service -n 100 --no-pager
sudo systemctl start bloli-nearby-backup.service
```

The daily backup timer runs around 04:30–04:45 Europe/Berlin. Dumps are in the project's `backups/` directory. Each completed dump is structurally checked with `pg_restore --list` before publication; older generated `bloli-nearby-TIMESTAMP.dump` files are then removed, retaining the latest verified dump. Monitor disk usage and arrange secure off-host backups; backup pruning happens only after the new dump and archive check succeed. A directory lock prevents overlapping dumps. If a process was killed without cleanup, confirm that no backup is running before removing a stale `backups/.backup.lock` directory. Back up `.env`, `.secrets/db_password`, and host `/etc/letsencrypt` securely as well. Do not publish them in Git.

## Roll back app code

Pause `bloli-nearby-refresh.timer` before an incompatible rollback. Once View and Sights are active, do not run an older category importer against the ten-category database. Keep refresh paused until compatible code is restored or a matching pre-change backup is restored, then resume the timer explicitly.

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
scripts/restore.sh --replace-database backups/bloli-nearby-TIMESTAMP.dump
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
sudo install -m 0644 deploy/systemd/bloli-nearby-refresh.service deploy/systemd/bloli-nearby-refresh.timer deploy/systemd/bloli-nearby-backup.service deploy/systemd/bloli-nearby-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl restart bloli-nearby-refresh.timer bloli-nearby-backup.timer
```

Certificate renewal uses the existing Snap Certbot timer and the domain-scoped hook documented in [the HTTPS setup guide](contabo-nginx.md). Verify each app lineage without changing unrelated sites' renewal configuration:

```bash
for domain in loo.bloli.com kippe.bloli.com kebab.bloli.com water.bloli.com transit.bloli.com charge.bloli.com atm.bloli.com stay.bloli.com view.bloli.com sights.bloli.com; do
  sudo /snap/bin/certbot renew --cert-name "$domain" --dry-run --run-deploy-hooks --no-random-sleep-on-renew
done
```
