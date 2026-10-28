# Multi-country coverage operations

All six Bloli Nearby sites use the existing `bloli-nearby` web/API services, `bloli_nearby` PostGIS database, import volume, Docker network and systemd refresh timer. This change adds national snapshots to that shared stack. It does not add a container, host port, domain or map-tile service.

The rollout order is enforced by the country CLI: Germany stays active, Romania must be active before Austria can be activated, and Austria must be active before Hungary. A pending country's published data remains excluded from search and map coverage. Deactivate downstream countries before their prerequisite.

## Source and storage paths

The importer uses Geofabrik PBF files and matching `.poly` country coverage polygons. It checks the PBF MD5 and records a SHA-256 checksum for the polygon. Each country has a separate cache inside the current Docker volume:

| Country | Code | Import-volume path | Time zone |
| --- | --- | --- | --- |
| Germany | `de` | `/data` (retained legacy cache) | `Europe/Berlin` |
| Romania | `ro` | `/data/countries/ro` | `Europe/Bucharest` |
| Austria | `at` | `/data/countries/at` | `Europe/Vienna` |
| Hungary | `hu` | `/data/countries/hu` | `Europe/Budapest` |

On the VM, these paths are inside `/var/lib/docker/volumes/bloli-nearby_import_data/_data/`. Germany's existing verified PBF remains in place and is reused. Do not copy PBFs, filtered files, extracted JSONL or database storage into Git. Country caches share the one existing volume; each retains its source PBF, checksum, URL, polygon, transit context and temporary preparation files.

## Configure country count floors

Production's current Germany floors remain in `.env` as `MIN_FACILITIES`, `MIN_SETTLEMENTS`, `MIN_SELLERS`, `MIN_KEBABS`, `MIN_WATER_POINTS`, `MIN_TRANSIT_STOPS` and `MIN_CHARGE_STATIONS`. Foreign-country floors are independent. For each country, set all seven variables after measuring a complete country extract:

```text
MIN_RO_TOILETS
MIN_RO_SELLERS
MIN_RO_KEBABS
MIN_RO_WATER_POINTS
MIN_RO_TRANSIT_STOPS
MIN_RO_CHARGE_STATIONS
MIN_RO_SETTLEMENTS
```

Use the same suffixes with `AT` and `HU` for later countries. Values are positive counts, not ratios. Set floors below the verified expected counts with room for normal OSM variation, but high enough to reject incomplete extraction. The existing `MIN_IMPORT_RATIO` independently rejects a drop below the configured share of the previous country snapshot. Never use the local sample values as production floors.

For the initial pending-country measurement, floors of `1` permit a non-public bootstrap snapshot. The importer prints exact category and settlement counts, while the country remains pending and invisible to search. Set measured production floors in `.env`, then run that country's refresh again. Only activate after the second snapshot succeeds with the measured floors and all release checks pass. This bootstrap floor is not suitable once a country is active.

## Targeted refresh and staged activation

Run commands from `/home/oliver/stack/bloli-nearby` on `ssh-contabo`. The compose helper reads the production Compose configuration and existing secret. A targeted refresh does not activate a pending country:

```bash
scripts/refresh-countries.sh ro
scripts/compose.sh exec -T db psql -U bloli -d bloli_nearby -c \
  "SELECT country_code,category,dataset_at,location_count,settlement_count,source FROM country_datasets ORDER BY country_code,category"
```

After setting measured floors in the VM `.env`, build the changed importer image if the code changed, run the targeted refresh again, and verify all six category rows plus verified checksums. The active-country status endpoint reports each country's state, readiness, counts, source date and latest refresh:

```bash
curl --fail --silent --show-error https://loo.bloli.com/api/status
```

After Romania passes its release gate, activate it through the API container. The CLI refuses activation without six checksummed category snapshots:

```bash
scripts/compose.sh exec -T api node --import tsx src/server/country-cli.ts activate ro
```

Run and record the Romania gate before proceeding: query all six sites around Munich and Bucharest; verify German and Romanian coverage boundaries and no foreign-country leakage; check DE/EN/RO on desktop and narrow phone widths; compare Germany counts/IDs to the pre-change protocol; verify Romanian timezone/DST Open now; confirm map tiles, health/readiness and pending-country exclusion; create and verify a backup; and demonstrate a targeted refresh failure leaves the prior country snapshot active. The full checklist and output belong in the dated VM protocol.

Only after Romania passes, configure and refresh Austria, set its measured floors, refresh it again, and activate it. Verify Vienna and DE/AT border searches. Then repeat for Hungary and verify Budapest and AT/HU/HU/RO border searches. The CLI blocks activation out of order and blocks deactivation when downstream countries remain active. Keep a verified backup before each activation so a single country can be returned to pending without discarding the other countries.

To hide a country while preserving its snapshot and cache, deactivate it in reverse order:

```bash
scripts/compose.sh exec -T api node --import tsx src/server/country-cli.ts deactivate hu
scripts/compose.sh exec -T api node --import tsx src/server/country-cli.ts deactivate at
scripts/compose.sh exec -T api node --import tsx src/server/country-cli.ts deactivate ro
```

## Scheduled refresh and partial failure

`bloli-nearby-refresh.timer` continues to run `scripts/update.sh` weekly. It now queries active countries and refreshes them sequentially in rollout order. It continues after one country fails, writes an outcome per country, and exits nonzero if any country failed. The app's PostgreSQL advisory lock prevents overlapping work. Pending countries are not downloaded during the normal refresh; retry one explicitly with `scripts/refresh-countries.sh ro` (or `at`/`hu`). Check both systemd's exit status and each site's `/api/status` after scheduled work. A failed country keeps its prior published snapshot; other countries may refresh successfully.

The refresh timer and backup schedule remain the existing ones. To check them and see country-specific cache sizes:

```bash
systemctl list-timers --all bloli-nearby-refresh.timer bloli-nearby-backup.timer
journalctl -u bloli-nearby-refresh.service --since '7 days ago'
scripts/compose.sh --profile tools run --rm --no-deps --entrypoint sh importer -c 'du -sh /data /data/countries/* 2>/dev/null || true'
```

See [data storage](data-storage.md), [production updates](production-updates.md), and the [migration guide](bloli-nearby-migration.md) for backup, restore, deployment, and rollback details. Before an incompatible rollback, pause the refresh timer. Do not run an old Germany-only importer against the multi-country schema.
