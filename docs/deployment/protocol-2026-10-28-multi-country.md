# Multi-country production rollout protocol

## Preflight and rollback point

Date: 2026-10-28. Production host: Contabo VM `vmd34296`, checkout `/home/oliver/stack/bloli-nearby`. This protocol records the controlled DE → RO → AT → HU rollout. Do not activate Austria before Romania's release gate passes, or Hungary before Austria is verified.

Before the schema change, production was at revision `1793309e718dbc72a39a5b1e31e441e2a664988b`; six public site containers (API, web and PostGIS) were healthy. The VM had 8 CPUs, 29 GiB RAM (18 GiB available) and 524 GiB free on `/`. The import volume occupied 6.7 GiB and retained the verified 4.6 GB Germany source at `/data/source.osm.pbf` plus the 260 MB Transit context file. Docker volumes remain `bloli-nearby_import_data` and `bloli-nearby_postgres_data`, mounted under `/var/lib/docker/volumes/`.

Pre-migration category snapshots all used Germany source `https://download.geofabrik.de/europe/germany-261025.osm.pbf`, timestamp `2026-10-25T21:21:21Z`:

| Category | Count | Sorted identity checksum |
| --- | ---: | --- |
| Toilets | 25,954 | `97cbe8a7ed9b30e20738e931986c5816` |
| Tobacco | 107,861 | `f45592e1d1a0a7319c01d08740529b48` |
| Kebab | 11,267 | `a1fc7f2628821463d5cd7a7c691db4c4` |
| Water | 14,620 | `b54a61e958a9d7955676e17f21a97e06` |
| Transit | 799,433 | `709ef24fa5a8399dc445b12d5758e4ad` |
| Charge | 40,401 | `ba19a9b5a7fecc650f5c8600dd3beb3f` |
| Settlements | 196,951 | `5b3a3db6d7f5dac0ad498fc89f3df492` |

The shared `locations` table contained 998,609 distinct OSM identities before migration. Fingerprints are MD5 of sorted semicolon-joined IDs from each category's `location_categories` membership (and settlement IDs for the last row); use the same query when comparing the German backfill.

The existing `bloli-nearby-refresh.timer` was active before migration. It was stopped during rollout, and the refresh service was confirmed inactive. The daily backup timer was not changed. After all four country gates passed, the refresh timer was started again; it is enabled and active, with its next run on 2026-11-01 at 03:20 CET.

Verified rollback point: `/home/oliver/stack/bloli-nearby/backups/bloli-nearby-20261028T124309Z.dump`, 207,797,227 bytes, SHA-256 `22831f84afe9c75ba68b2bf0ea9174ce4fe63661157043b2c5e79f405297743b`. `pg_restore --list` succeeded inside the running PostGIS container. Private configuration copies were saved mode `0600` as `backups/env-before-multicountry-20261028T124309Z` and `backups/compose-before-multicountry-20261028T124309Z.yaml`; these files are ignored and must never enter Git.

## Implementation and verification

The source implementation, checks and country-specific rollback/update instructions were deployed from feature branch `feat/multi-country-coverage`. No PBF, database dump, environment file or generated asset is part of Git. The Germany import cache is now at `/data/countries/de`; Romania, Austria and Hungary use `/data/countries/ro`, `/data/countries/at` and `/data/countries/hu` in the same Docker volume. Total retained country caches occupy about 8.6 GiB. Exact source metadata, source-file sizes and cache sizes are recorded below.

The importer fix for malformed/incomplete facility multipolygons is commit `8f2c035`; its regression test failed with the original `list has no attribute get` exception and passed with the corrected tag dictionary. All 44 importer tests passed. The production gate was extended to probe Vienna and Budapest, check active-country copy in DE/EN/RO, and wait for the country status request; the final gate passed across all six sites. The gate source is on the feature branch through `b29ccce`.

## Live rollout results

Geofabrik dated extracts were used for each country. Geofabrik MD5 values below were verified by the importer before extraction. Country-specific publication floors were set to approximately 80% of each first complete measured count, rounded to whole records. The temporary bootstrap floor of 1 was not retained: each pending country was reimported successfully with its permanent floors before activation.

### Germany schema backfill

Completed. Verified Germany source is `https://download.geofabrik.de/europe/germany-261025.osm.pbf`, dataset time `2026-10-25T21:21:21Z`, MD5 `1a2bd3665c3e2507e1da99befd2ac228`. The retained source is 4.6 GiB; `/data/countries/de` occupies 6.7 GiB and also holds the 260 MiB Transit context and 2.0 GiB extracted JSONL. DE category and settlement counts/identity checksums remain the pre-migration values in the table above. All six sites remained healthy and retained their generic resource bindings. No Germany-only importer was run after the country migration.

### Romania activation gate

Completed and passed before Austria activation. Source: `https://download.geofabrik.de/europe/romania-261027.osm.pbf`, dataset time `2026-10-27T21:23:59Z`, MD5 `740bd9b92a8ce92f8d223c0a36367d0a`. `/data/countries/ro/source.osm.pbf` is 317 MiB, Transit context 4.4 MiB, extracted JSONL 40 MiB; directory total 361 MiB. Counts: toilets 1,335; tobacco 18,353; kebab 381; water 3,083; transit 28,858; charge 699; settlements 19,590. Permanent floors are approximately 80% of those counts.

The verified pre-activation backup was `backups/bloli-nearby-20261028T141818Z.dump`, 219,919,053 bytes, SHA-256 `74cab028ea1945a0e97104af0e9522aa3122cfcdc467f24d389aa219f18d7ea9`; `pg_restore --list` returned 86 entries. The gate passed for Munich and Bucharest on all six sites, unaccented `bucuresti`, Romanian country attribution, DE/EN/RO mobile layout, maps/tiles and browser errors. Romania was activated only after the gate passed; Austria and Hungary were pending at that point.

### Austria activation

Completed after the Romania gate passed. Source: `https://download.geofabrik.de/europe/austria-261027.osm.pbf`, dataset time `2026-10-27T21:23:59Z`, MD5 `09afe12361079d2b6997fdc52b1985ad`. `/data/countries/at/source.osm.pbf` is 777 MiB, Transit context 47 MiB, extracted JSONL 298 MiB; directory total 1.1 GiB. Counts: toilets 5,556; tobacco 13,222; kebab 1,098; water 9,861; transit 122,003; charge 6,000; settlements 45,645. Permanent floors are approximately 80% of those counts and are stored in the VM's private `.env`.

Two mapped toilet multipolygons lacked constructible polygon geometry. Importer fallback now uses a representative mapped member point while retaining the relation's tag dictionary; regression coverage was added. The verified pre-activation backup was `backups/bloli-nearby-20261028T161648Z.dump`, 249,723,224 bytes, SHA-256 `ce22e389060cd451ae6f01fd6eca0ce83ef6f748f772699fa4492e66a985a1ec`; restore catalog contained 96 entries. The release gate passed all six sites in Munich and Vienna, with DE/EN/RO country coverage, map tiles, mobile widths and no browser errors. Austria was then activated; Hungary remained pending until its own gate.

### Hungary activation

Completed after Austria passed. Source: `https://download.geofabrik.de/europe/hungary-261027.osm.pbf`, dataset time `2026-10-27T21:23:59Z`, MD5 `9e3cf721f1d974f58871d91c82eb5679`. `/data/countries/hu/source.osm.pbf` is 313 MiB, Transit context 16 MiB, extracted JSONL 97 MiB; directory total 424 MiB. Counts: toilets 2,817; tobacco 15,861; kebab 266; water 16,110; transit 54,907; charge 1,559; settlements 19,988. Permanent floors are approximately 80% of those counts and are stored in the VM's private `.env`.

The verified pre-activation backup was `backups/bloli-nearby-20261028T163156Z.dump`, 263,607,380 bytes, SHA-256 `65ce47244366fbf47b164c862b635e2adaf313d1ef16084d2bee144bb8beb050`; restore catalog contained 96 entries. The final four-country gate passed all six sites in Munich, Bucharest, Vienna and Budapest, including active/readiness/date fields, localized coverage in German, English and Romanian at 320/390/430 px, map images, filters, API category isolation and no browser errors. Transit border probes returned both DE+AT near Freilassing/Saalach, AT+HU west of Sopron, and HU+RO near Nagylak/Nădlac. Hungary was activated after its snapshot passed its permanent floors and the pre-activation backup was verified.

### Final refresh and backup verification

The final post-activation backup is `backups/bloli-nearby-20261028T164121Z.dump`, 263,607,375 bytes, SHA-256 `4d706cb69312cb7971af6871cf706fd75af4bf3fc8fe22d830c57663520fbd03`; `pg_restore --list` returned 96 entries. The public status API reports all four countries active/ready and a deduplicated Transit total of 1,004,463 (the sum of per-country Transit memberships is higher because shared border identities are deduplicated). The targeted refresh command succeeded for AT and HU during their initial imports; RO was refreshed and activated during its earlier gate. The normal refresh script now enumerates active countries sequentially. `bloli-nearby-refresh.timer` is enabled and active again; next run is 2026-11-01 03:20 CET. The daily `bloli-nearby-backup.timer` remained active and unchanged. API, web and database containers are healthy; no importer container remains running. The app uses the existing Docker services, volumes, network and Nginx integration; no host Nginx or public port changes were made.
