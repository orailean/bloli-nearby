# One-time Bloli Nearby resource rename

Target production resources are Compose project `bloli-nearby`, PostgreSQL volume `bloli-nearby_postgres_data`, and source/staging volume `bloli-nearby_import_data`. Service/image names, internal ports, DB `bloli_nearby`, role `bloli`, password secret and shared Nginx network/alias stay unchanged.

Historical source resources are project `find-a-loo`, DB volume `find-a-loo_postgres_data` and import volume `find-a-loo_import_data`. Docker has no direct volume rename; changing the YAML alone would attach an empty volume. This migration copies and verifies data instead.

## Required order

1. Finish the active importer successfully, save its logs/counts and remove the exited importer. Pause only `bloli-nearby-refresh.timer`, recording its prior active state. Confirm no importer still owns the source lock or DB refresh lock.
2. **Before pulling the generic project/volume override**, from `/home/oliver/stack/bloli-nearby` save the current fully resolved `docker compose config` to a private `backups/compose-before-volume-migration.yaml`, copy `.env` privately and record the actual DB/import mounts and category datasets. Run `scripts/backup.sh` and verify `pg_restore --list`.
3. Confirm target names are absent/empty and not attached to another stack; create explicitly labelled migration targets. Never overwrite a nonempty target blindly.
4. Copy import data first while the app remains online, with the old import volume read-only and its existing file lock held. No importer may write during this copy. Use a root helper with `cp -a /from/. /to/`, preserving ownership, symlinks and permissions. Compare complete regular-file SHA256 manifests from source and target, including the retained source PBF, and file/directory metadata.
5. Stop/remove the old app stack through the **saved** configuration and explicit old project name, without deleting volumes:

```bash
docker compose -p find-a-loo -f backups/compose-before-volume-migration.yaml down
```

6. With PostgreSQL fully stopped, copy the old PGDATA volume read-only to its empty target using `cp -a`; compare file SHA256 manifests/metadata. Do not copy live PostgreSQL files. Retain both original volumes untouched.
7. Pull the reviewed generic configuration and set `.env` bindings to `POSTGRES_VOLUME=bloli-nearby_postgres_data`, `IMPORT_VOLUME=bloli-nearby_import_data`. Remove/update a legacy `COMPOSE_PROJECT_NAME` if present, and preserve `COMPOSE_FILE=compose.yaml:compose.production.yaml`, DB_USER/DB_NAME and secret. Start the generic stack:

```bash
docker compose config --quiet
docker compose up -d --wait db api web
```

8. Verify project labels and actual mounts, database/login, all category counts/source dates/import timestamps, shared settlement count, all public sites and lack of new published host ports. Validate/gracefully reload the existing Nginx after health checks if needed for its upstream DNS cache. Resume the previously active refresh timer only after verification. Take and verify a new backup under the generic project.
9. Original volumes remain unmounted rollback copies; they are not current configuration bindings. Do not remove them before verifying the new stack and backup. Historical protocols retain their original names for audit purposes.

## Copy verification and rehearsal

Use the same pinned PostGIS image as the DB for root copy/checksum helpers, with `--entrypoint bash`; no host ports are published. Source is mounted `:ro`, target read/write. The destination must be empty. Inside each mount, sorted `find -type f`/`sha256sum` manifests must match; also compare ownership/modes and symlink targets. A disposable local copy of a stopped development volume rehearses physical PostgreSQL startup and sample category counts before production operations. Do not transfer actual DB files into Git.

## Rollback

If copying fails, leave the original running stack/bindings untouched when still online. If startup/verification fails after stopping it, stop the new project (without `-v`), restore the private pre-migration `.env`, and use the saved configuration with `-p find-a-loo` to start the original data copies and generic service names. Never run both projects simultaneously with the same container names. Confirm counts/health before resuming the timer. The original data includes the successful three-category import, so a name-only rollback need not erase Kebab data.

See the dated [Kebab rollout protocol](protocol-2026-10-27-kebab.md) for actual evidence, backups, timings and resulting mount paths. The configuration already describes the target names; this guide is a controlled one-time procedure, not an ordinary app update command.
