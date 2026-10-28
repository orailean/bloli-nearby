# Production data locations

There is intentionally no `data/` folder in `/home/oliver/stack/bloli-nearby` for the production deployment. The Compose configuration stores persistent data in **Docker named volumes**, independently of the Git checkout. A local `data/` folder is used only by the optional native-development examples.

## What is downloaded

- **Visible map background:** browsers load raster tiles directly from OpenStreetMap. The VM does not bulk-download or serve Germany map tiles.
- **OSM source data:** the importer downloads a country `.osm.pbf` dataset from Geofabrik, verifies its published checksum and extracts all six site categories and settlements. Germany retains the original `/data` cache; Romania, Austria and Hungary use isolated `/data/countries/{ro,at,hu}` caches in the same Docker volume.
- **Search database:** normalized facility and settlement records, coverage, source dates and import job history are stored in PostGIS.

## Exact VM paths

Verified using `docker volume inspect` on this VM:

| Content | Docker volume | Container path | Host path |
| --- | --- | --- | --- |
| Downloaded source and import staging | `bloli-nearby_import_data` | `/data` in importer | `/var/lib/docker/volumes/bloli-nearby_import_data/_data` |
| PostgreSQL/PostGIS files | `bloli-nearby_postgres_data` | `/var/lib/postgresql/data` in db | `/var/lib/docker/volumes/bloli-nearby_postgres_data/_data` |
| Application database dumps | Project `backups/` directory | Not a DB data directory | `/home/oliver/stack/bloli-nearby/backups/` |
| Deployment/build logs | Project `logs/` directory and systemd journal | N/A | `/home/oliver/stack/bloli-nearby/logs/` |

Docker's storage root can differ on another host. Discover the current paths rather than assuming them:

```bash
docker volume inspect bloli-nearby_import_data bloli-nearby_postgres_data --format '{{.Name}} {{.Mountpoint}}'
```

## Inspect downloads and progress

While an importer is running, inspect the active importer and its recent output:

```bash
docker ps --filter label=com.docker.compose.service=importer
docker compose logs --tail 50 importer
docker stats --no-stream
```

After it exits, or for scheduled imports with another container name, inspect the same persistent volume through a one-shot helper. Overriding the entrypoint avoids starting a download or import:

```bash
cd /home/oliver/stack/bloli-nearby
scripts/compose.sh --profile tools run --rm --no-deps --entrypoint sh importer -c 'du -sh /data /data/countries/* 2>/dev/null || true; find /data -maxdepth 3 -type f -printf "%p %s bytes\\n" | sort'
```

You can also inspect the host directory with `sudo ls -lh /var/lib/docker/volumes/bloli-nearby_import_data/_data`; do not change Docker volume files directly.

The initial Germany snapshot (2026-10-25) occupied 4.6 GB as a compressed source and approximately 111 MiB after the five-category Transit filter; complete JSON was 1.9 GiB, relation sidecar 260 MiB and PostgreSQL database 2091 MB. These are different processing stages; JSON repeats context and does not need to fit in memory. Each additional country's source and temporary extraction will increase disk use. Measure available disk and per-country cache sizes before each import. Filtering reads the source in multiple passes, so its output can remain empty initially.

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

The filenames stay `source.osm.pbf` within each country cache even if a dated upstream snapshot is used; `/api/status` and import metadata record the source. Temporary files may be absent after cleanup or an early failure. Normal app startup never initiates a download.

## Inspect active search data safely

```bash
curl --fail --silent --show-error https://loo.bloli.com/api/status
cd /home/oliver/stack/bloli-nearby
scripts/compose.sh exec -T db psql -U bloli -d bloli_nearby -c 'SELECT source,dataset_at,imported_at,facility_count,settlement_count FROM dataset;'
scripts/compose.sh exec -T db psql -U bloli -d bloli_nearby -c 'SELECT id,status,started_at,finished_at,facility_count,settlement_count,error FROM import_jobs ORDER BY id DESC LIMIT 10;'
```

An initial download does not immediately make the data searchable. The importer must finish extraction and transactional publication before readiness becomes true. Failed refreshes keep the previous active dataset. Do not copy or edit live PostgreSQL data files; use `scripts/backup.sh` and the documented restore procedure.

Datasets, database files, dumps, screenshots, built assets and secrets are not committed to Git. See [production updates](production-updates.md) and [the Transit deployment protocol](protocol-2026-10-27-transit.md).

The legacy `find-a-loo_*` volumes were the pre-rename sources. The 2026-10-27 rollout uses verified copies under the generic names; original unmounted copies were explicitly removed at the owner’s request on2026-10-27T18:49:26Z after confirming zero references and verifying a backup. Current rollback uses verified dumps and retained image/configuration backups, not the deleted old volumes. See [volume migration](volume-name-migration.md) and the [Kebab protocol](protocol-2026-10-27-kebab.md). Never copy a running PostgreSQL volume.

All country caches share the `bloli-nearby_import_data` volume. Germany's existing retained PBF is reused; each newly imported country keeps its own PBF and filters so a failed or pending import cannot replace another country's source. The scheduled refresh processes active countries one at a time. See [multi-country operations](multi-country-coverage.md) for exact paths and retry commands.

Transit adds a source-bound SQLite relation metadata sidecar in the same import volume: `/data/transit-context.sqlite` and `/data/transit-context.source`. It contains route labels/mode evidence and stop_area membership, not route path geometry or a second map. The source checksum/context version controls reuse; all five categories/context publish atomically. Source PBF and visible browser tiles retain their existing separate roles.
