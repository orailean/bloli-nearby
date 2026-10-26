# Production data locations

There is intentionally no `data/` folder in `/home/oliver/stack/bloli-nearby` for the production deployment. The Compose configuration stores persistent data in **Docker named volumes**, independently of the Git checkout. A local `data/` folder is used only by the optional native-development examples.

## What is downloaded

- **Visible map background:** browsers load raster tiles directly from OpenStreetMap. The VM does not bulk-download or serve Germany map tiles.
- **Germany OSM source:** the importer downloads Germany's `.osm.pbf` dataset from Geofabrik, verifies its published checksum and extracts toilets/settlements.
- **Search database:** normalized facility and settlement records, coverage, source dates and import job history are stored in PostGIS.

## Exact VM paths

Verified using `docker volume inspect` on this VM:

| Content | Docker volume | Container path | Host path |
| --- | --- | --- | --- |
| Downloaded source and import staging | `find-a-loo_import_data` | `/data` in importer | `/var/lib/docker/volumes/find-a-loo_import_data/_data` |
| PostgreSQL/PostGIS files | `find-a-loo_postgres_data` | `/var/lib/postgresql/data` in db | `/var/lib/docker/volumes/find-a-loo_postgres_data/_data` |
| Application database dumps | Project `backups/` directory | Not a DB data directory | `/home/oliver/stack/bloli-nearby/backups/` |
| Deployment/build logs | Project `logs/` directory and systemd journal | N/A | `/home/oliver/stack/bloli-nearby/logs/` |

Docker's storage root can differ on another host. Discover the current paths rather than assuming them:

```bash
docker volume inspect find-a-loo_import_data find-a-loo_postgres_data --format '{{.Name}} {{.Mountpoint}}'
```

## Inspect downloads and progress

While the initial named importer is running:

```bash
docker exec find-a-loo-germany-import ls -lh /data
docker logs --tail 50 find-a-loo-germany-import
docker stats --no-stream find-a-loo-germany-import
```

After it exits, or for scheduled imports with another container name, inspect the same persistent volume through a one-shot helper. Overriding the entrypoint avoids starting a download or import:

```bash
cd /home/oliver/stack/bloli-nearby
scripts/compose.sh --profile tools run --rm --no-deps --entrypoint sh importer -c 'ls -lh /data'
```

You can also inspect the host directory with `sudo ls -lh /var/lib/docker/volumes/find-a-loo_import_data/_data`; do not change Docker volume files directly.

The initial Germany snapshot (2026-10-25) occupied 4.6 GB as a compressed source and approximately 48 MB after filtering. Future snapshots vary. Filtering reads the source in multiple passes, so its output can remain empty initially.

Expected files:

- `source.osm.pbf.part`: active or interrupted source download.
- `source.osm.pbf`: completed checksum-verified source.
- `source.md5`: upstream transfer-integrity checksum.
- `source.url`: exact immutable dated source URL selected for the verified file.
- `coverage.poly`: source geographic coverage.
- `filtered.osm.pbf` and `filtered.source`: completed filtered extract and source/filter marker, retained after extraction errors for retry and removed after successful preparation.
- `extracted.jsonl.part`: incomplete extraction, never published.
- `extracted.jsonl`: complete extraction used for publication.
- `import.lock`: lock file; its presence alone does not mean a job is running.

The current filename stays `source.osm.pbf` even if a dated upstream snapshot is used; `/api/status` and import metadata record the source. Temporary files may be absent after cleanup or an early failure. Normal app startup never initiates a download.

## Inspect active search data safely

```bash
curl --fail --silent --show-error https://loo.bloli.com/api/status
cd /home/oliver/stack/bloli-nearby
scripts/compose.sh exec -T db psql -U bloli -d bloli_nearby -c 'SELECT source,dataset_at,imported_at,facility_count,settlement_count FROM dataset;'
scripts/compose.sh exec -T db psql -U bloli -d bloli_nearby -c 'SELECT id,status,started_at,finished_at,facility_count,settlement_count,error FROM import_jobs ORDER BY id DESC LIMIT 10;'
```

An initial download does not immediately make the data searchable. The importer must finish extraction and transactional publication before readiness becomes true. Failed refreshes keep the previous active dataset. Do not copy or edit live PostgreSQL data files; use `scripts/backup.sh` and the documented restore procedure.

Datasets, database files, dumps, screenshots, built assets and secrets are not committed to Git. See [production updates](production-updates.md) and [the deployment protocol](protocol-2026-10-26.md).
