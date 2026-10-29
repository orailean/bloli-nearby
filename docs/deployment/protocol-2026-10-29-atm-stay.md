# ATM, Stay and Hungarian rollout, 2026-10-29

Production: Contabo `vmd34296`, checkout `/home/oliver/stack/bloli-nearby`. Approved scope: ATM at `atm.bloli.com`, accommodation at `stay.bloli.com`, Hungarian across all eight sites, all four currently active countries. Existing Docker Nginx/shared app/database/volumes/ports are retained; production runs approved merged source from `main`.

## Local implementation gate

The existing six sites plus ATM/Stay have separate EN/DE/RO/HU dictionaries. Unsupported browser language still defaults to German. ATM uses mapped access hours and walking directions; Stay distinguishes reception from room availability and uses driving directions. Reviewer findings addressed: documented embedded-ATM hours precedence, Stay addresses, Hungarian live-gate state, and exact retained-source publication.

Local checks passed: 85 unit tests, 49 importer tests, 17 PostGIS integration checks and 32 browser cases (all eight sites at desktop/320/390/430 px, four languages). Eight additional browser cases cover the reviewed ATM phone filters and Stay mapped addresses; all passed. Temporary test database: `bloli_nearby_atm_stay_20261029`, distinct from existing local databases.

## Production preflight and rollback

Baseline source was production main `781d362`, with healthy shared API/web/PostGIS and 519 GiB free disk. Saved country/category counts and sorted identity MD5 fingerprints in private VM `logs/atm-stay-20261029/before.json`. Saved private `.env` and resolved Compose copies mode0600 in `backups/atm-stay-before.env` and `backups/atm-stay-before-compose.yaml`. The existing refresh timer was active; it was stopped and refresh service confirmed inactive before rollout. The daily backup schedule was unchanged.

Verified rollback dump: `backups/bloli-nearby-20261029T093308Z.dump`, 265,033,522 bytes, SHA-256 `f59a2f7f4c4acfe6e636f7433001af350858bdfde0feb2d8e85f2db8d3af4f1f`; `pg_restore --list` returned 100 entries. Docker Nginx uses its existing `nginx_nginx_conf` volume and bind-mounted Let's Encrypt/webroot paths. No public ports are added.

## National measurement and publication

Pending. Each retained source is verified without downloading a newer PBF; measurement rolls database staging back. Configure national ATM/accommodation floors from measured normalized counts and publish the exact measured JSONL under shared locks. Existing six categories must keep their identities/counts. Record source/date, counts, sizes, resource samples and completion evidence per country.

## Domains, certificates and final gate

Both HTTP bootstrap vhosts were added inside the existing Docker Nginx config volume after archiving its config as `backups/nginx-before-atm-stay.tar.gz`. External challenge probes passed on both domains. Issued separate Let's Encrypt certificates via the existing Snap Certbot account/webroot; both expire 2027-01-27. Updated the shared eight-domain deploy hook. Both new certificate dry runs with deploy hooks succeeded; `snap.certbot.renew.timer` is active. Evidence: `logs/atm-stay-20261029/{cert-atm,cert-stay,renewal-atm,renewal-stay}.log`. HTTPS public finder cutover awaits all national publications.

The deployed main revision is `6b27e40`; shared API/web are healthy. All six existing domains passed the live four-country/four-language gate, including map tiles and mobile widths, before new category publication. Before-publication query timings are saved in `logs/atm-stay-20261029/pre-publication-times.json`. Dedicated test and sample databases were dropped, and the local dev database container is stopped. Final eight-site checks, post-publication backup and refresh resumption remain pending.
