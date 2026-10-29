# ATM, Stay and Hungarian rollout, 2026-10-29

Production: Contabo `vmd34296`, checkout `/home/oliver/stack/bloli-nearby`. Approved scope: ATM at `atm.bloli.com`, accommodation at `stay.bloli.com`, Hungarian across all eight sites, all four currently active countries. Existing Docker Nginx/shared app/database/volumes/ports are retained; production runs approved merged source from `main`.

## Local implementation gate

The existing six sites plus ATM/Stay have separate EN/DE/RO/HU dictionaries. Unsupported browser language still defaults to German. ATM uses mapped access hours and walking directions; Stay distinguishes reception from room availability and uses driving directions. Reviewer findings addressed: documented embedded-ATM hours precedence, Stay addresses, Hungarian live-gate state, and exact retained-source publication.

Local checks passed: 85 unit tests, 49 importer tests, 17 PostGIS integration checks and 32 browser cases (all eight sites at desktop/320/390/430 px, four languages). Eight additional browser cases cover the reviewed ATM phone filters and Stay mapped addresses; all passed. Temporary test database: `bloli_nearby_atm_stay_20261029`, distinct from existing local databases.

## Production preflight and rollback

Baseline source was production main `781d362`, with healthy shared API/web/PostGIS and 519 GiB free disk. Saved country/category counts and sorted identity MD5 fingerprints in private VM `logs/atm-stay-20261029/before.json`. Saved private `.env` and resolved Compose copies mode0600 in `backups/atm-stay-before.env` and `backups/atm-stay-before-compose.yaml`. The existing refresh timer was active; it was stopped and refresh service confirmed inactive before rollout. The daily backup schedule was unchanged.

Verified rollback dump: `backups/bloli-nearby-20261029T093308Z.dump`, 265,033,522 bytes, SHA-256 `f59a2f7f4c4acfe6e636f7433001af350858bdfde0feb2d8e85f2db8d3af4f1f`; `pg_restore --list` returned 100 entries. Docker Nginx uses its existing `nginx_nginx_conf` volume and bind-mounted Let's Encrypt/webroot paths. No public ports are added.

## National measurement and publication

Measured each existing retained PBF with `USE_RETAINED_SOURCE=1` and `MEASURE_ONLY=1`, then published its exact SHA-256-matched JSONL. Each measurement rolled its database staging back. This reused source files and source-bound transit contexts; no new PBF was downloaded. All four countries now have eight active category snapshots (32 rows total), and the pre-existing six categories have exactly the same location membership counts and sorted identity fingerprints as before publication.

| Country | Pinned source timestamp (UTC) | Source MD5 | Extracted JSONL bytes | ATM count / floor | Accommodation count / floor |
| --- | --- | --- | ---: | ---: | ---: |
| Germany | 2026-10-25 21:21:21 | `1a2bd3665c3e2507e1da99befd2ac228` | 2,113,225,751 | 28,008 / 22,407 | 76,957 / 61,566 |
| Romania | 2026-10-27 21:23:59 | `740bd9b92a8ce92f8d223c0a36367d0a` | 45,721,654 | 2,946 / 2,357 | 10,584 / 8,468 |
| Austria | 2026-10-27 21:23:59 | `09afe12361079d2b6997fdc52b1985ad` | 322,047,118 | 5,070 / 4,056 | 20,896 / 16,717 |
| Hungary | 2026-10-27 21:23:59 | `9e3cf721f1d974f58871d91c82eb5679` | 105,048,598 | 3,275 / 2,620 | 8,005 / 6,404 |

Floors in the VM `.env` are 80% of measured normalized eligible counts, rounded up. All eight category dataset counts per country, provenance and settlements are recorded in `logs/atm-stay-20261029/{de,ro,at,hu}-release.json`; measurement, exact-file hash and publication output are in the corresponding `*-measure.log`, `*-extract-sha256.log` and `*-publish.log`. The sequential orchestration and identity comparisons are recorded in `controlled-rollout.log`; its helper and baseline SQL are retained in the same VM log directory. VM extract sizes are in `extract-sizes.txt`.

One measured importer geometry difference is recorded: Germany now has 196,951 settlement memberships, three fewer than the pre-publication 196,954 (0.002%). Existing category membership identities are unchanged. The Germany snapshot now also records source and boundary checksums where its old dataset rows did not. Romania, Austria and Hungary settlement counts and identities match the baseline.

## Domains, certificates and final gate

Both HTTP bootstrap vhosts were added to the existing Docker Nginx config volume after archiving the prior configs to `backups/nginx-before-atm-stay.tar.gz`. External HTTP-01 challenge probes passed. Separate Let's Encrypt certificates were issued through the existing Snap Certbot account/webroot; both expire 2027-01-27. The shared eight-domain deploy hook was installed, and certificate renewal dry runs with deploy hooks succeeded. The final ATM/Stay HTTPS vhosts were installed in the existing `nginx` container; `nginx -t` passed and Nginx reloaded. The only emitted warnings concerned pre-existing unrelated Nginx vhosts.

Public checks: `https://atm.bloli.com` and `https://stay.bloli.com` return HTTP/2 200 with valid certificates. `/api/site` reports ATM (`atm`, walking) and Stay (`accommodation`, driving). `/api/ready` reports all four countries active and ready on both hosts. Budapest nearby searches return Hungarian ATM and accommodation results. Certificates expire 2027-01-27. Renewal evidence is in `logs/atm-stay-20261029/{cert-atm,cert-stay,renewal-atm,renewal-stay}.log`.

The final rollback backup is `backups/bloli-nearby-20261029T140020Z.dump` (291 MB), SHA-256 `b078f221e2821a718cba89f8d86c1f3f496dc74f1b45852126553da0615b22ae`; `pg_restore --list` returned 100 entries. The first verified pre-rollout backup remains available at `backups/bloli-nearby-20261029T093308Z.dump`.

Before/after place and nearby endpoint timings are recorded in `pre-publication-times.json` and `post-publication-times.json`. The second nearby request stayed in the 169–580 ms range for the six existing sites (the transit search improved from 805 ms to 580 ms); new ATM and Stay searches returned 82 and 77 Budapest-area results in 201 ms and 248 ms respectively. These are live endpoint samples, not a load test.

The deployed application revision is `6b27e40` (merged on `main`); documentation and package metadata revision `07a74e1` was also pushed. Shared API, web and PostGIS containers are healthy, with no one-off importer container left. All six existing sites passed the live four-country/four-language and map-tile gate before publication. The refresh service was resumed only after publication; `bloli-nearby-refresh.timer` is active and next triggers Sunday 2026-11-01 at 03:38 CET. `snap.certbot.renew.timer` is active. The daily backup schedule was not changed. Dedicated local test/sample databases were dropped and the local dev database container is stopped.
