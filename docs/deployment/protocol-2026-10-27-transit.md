# Transit rollout protocol — 2026-10-27

Status: deployed and verified at https://transit.bloli.com on 2026-10-27. All five public sites passed browser/API checks.

## Scope and resources

- Fifth profile/category `transit.bloli.com` / `transit`, owner-approved rail/U-Bahn/S-Bahn/tram/light rail/bus/trolleybus/taxi/ferry/cable/funicular scope. Shared mobility and airports excluded; no live departure/vehicle claims. Country expansion remains on hold.
- One shared web/API/PostGIS/importer stack with generic `bloli-nearby-*` images/resources. No new permanent services, host ports, DB/login change or shared Nginx recreation.
- Checkout `/home/oliver/stack/bloli-nearby`; database/login `bloli_nearby` / `bloli`; active volumes `bloli-nearby_postgres_data` and `bloli-nearby_import_data`.

## Source/context verification and preflight

- Confirmed Transit A173.212.194.159 and no AAAA answer. Starting revision `a40bd34`; original four counts: WC25,954, tobacco107,861, kebab11,267 and Water14,620; settlements196,951.
- Retained source `https://download.geofabrik.de/europe/germany-261025.osm.pbf`, OSM timestamp `2026-10-25T21:21:21Z`. Verified checksum/source reuse; no new Germany PBF download.
- Built a bounded SQLite sidecar in the existing import volume without touching active DB data. Source contains115,961direct stop_area groups and60,481passenger route metadata records. No national route path geometry imported.
- Verified real S-Bahn evidence: München relation1773068/MVV, Berlin1929070/VBB, Hamburg1540437/HVV. Karlsruhe15090241/KVV remains light rail; S-number bus services remain buses. Version2 adds semicolon network/verified RVF handling. Rebuilt/cache-bound this context before the full import; source key/checksum/version and SQLite completion are checked during extraction.
- Source evidence: `logs/transit-source-evidence.json`. Sidecar `/data/transit-context.sqlite`, cache marker `/data/transit-context.source` in `bloli-nearby_import_data`.
- Saved private pre-change Compose/env/Nginx/renewal-hook backups and current revisions, containers, data and timer definitions under `backups/*before-transit*` and `logs/transit-before-*`.
- Pre-change backup `backups/bloli-nearby-20261027T183812Z.dump` verified with `pg_restore --list`; evidence `logs/transit-pre-backup-toc.txt` / `transit-pre-backup-path.txt`.

## Code and image deployment

- Feature revision `fd53e03` committed/pushed and pulled on the VM. Preserved previous API/web/importer tags as `bloli-nearby-{api,web,importer}:before-transit`.
- Used `umask022` for checkout/build while private backup scripts retain077. Built all shared images and checked actual API source/schema readability as its runtime user plus Transit HTML/favicon readability as Nginx’s worker user. Evidence: `logs/transit-image-readability.log` (`API_RUNTIME_READABLE`, `WEB_RUNTIME_READABLE`).
- `docker compose up -d --wait api web` succeeded; shared DB and Docker Nginx kept running. Build/deployment evidence `logs/transit-build-permissions.log`, `transit-app-redeploy.log`.
- Existing four public sites passed browser/API verification after compatible deployment, including real tiles, phone languages, directions and no page errors. Transit remains pending dataset activation at this stage.

## Five-category import

- Paused only `bloli-nearby-refresh.timer` and confirmed refresh service inactive before the controlled import.
- Started:

```sh
docker compose --profile tools run -d --name bloli-nearby-transit-import \
  -e DATA_URL=https://download.geofabrik.de/europe/germany-261025.osm.pbf \
  -e MIN_TRANSIT_STOPS=1000 importer
```

- Logs confirmed retained verified source and source-bound route-context reuse. Regenerated compact geometry filtering for all five categories; existing limit2CPUs/4GiB retained.
- Raw transport locations keep original identities; explicit stop_area membership feeds additive components and grouped queries. All categories, shared settlements and component context publish in one transaction; original data stays active until success.
- First extraction stopped at `2026-10-27T19:04:28Z` before DB import: 147 transit relations were treated as area geometries. Diagnosed context-only stop groups/destination signs and physical passenger relations with nested member geometry. Added three reproducing regressions, retained fatal missing-geometry validation, and deployed fix `1ed4f73` after all36 Python and56 unit tests passed. First failure retained in `logs/transit-import-attempt-1-geometry-failed.log`; restarted using the verified source, context and completed filter caches. Previous complete extraction was110MiB; new filtered PBF111MiB.
- Second extraction resolved the relation failures but stopped on closed way313391293, a valid station lift entrance. The area handler used tag-only classification while the way handler used station-membership context. Added an exact regression, confirmed RED, aligned classification and passed all37 importer tests. A geometry-only check of the entire cached dataset precedes the next full attempt.
- Deployed the lift-entrance fix `5c5ee0f`. Full cached-source geometry preflight passed for1,192,859 extracted records. Final attempt ran `19:42:27Z`–`20:04:12Z`, reusing source/context/filter; geometry output completed around19:56Z, followed by staging/validation/atomic publication. Kept all failed-attempt logs for audit; no failed extraction reached DB publication.
- Publication succeeded with25,954WC,107,861tobacco,11,267kebab,14,620water and799,433raw Transit components;196,951settlements. Original four category counts and source timestamps matched exactly. Transit resolves469,724logical groups/references; nearby results group passenger features and therefore differ from raw dataset counts. Set production `MIN_TRANSIT_STOPS=10000`.
- Verified post-import dump `backups/bloli-nearby-20261027T200417Z.dump` via `pg_restore --list`; evidence `logs/transit-post-backup-toc.txt`. Before Transit, the four-category filtered PBF was about73MiB and extracted JSON110MiB. Transit filter111MiB; completed JSON1.9GiB, relation SQLite260MiB, retained source4.6GiB. PostgreSQL database measured2091MB after publication. JSON repeats route/group context, so it is not a RAM allocation; measured extraction memory remained far below its4GiB limit.
- First immediate post-publication search check returned503 before PostgreSQL auto-analysis completed. Statistics show automatic analysis at20:04:57Z–20:06:01Z for shared locations/categories/components. Rechecked München/Berlin/Hamburg S-Bahn searches successfully at20:18Z in401–766ms, with unique logical IDs. Completed the guarded HTTPS activation afterward; did not rerun the successful import. Details `logs/transit-internal-readiness.json` / `transit-after-data.json`.

## TLS and scheduled operation

- Installed Transit HTTP ACME configuration in existing Docker Nginx and validated/gracefully reloaded; no unrelated vhost change.
- Issued Transit TLS with `/snap/bin/certbot certonly --webroot`, existing `/var/lib/dehydrated/acme-challenges` and existing account. Evidence `logs/transit-cert-issuance.log`, `transit-certificate-info.txt`; certificate path `/etc/letsencrypt/live/transit.bloli.com/`.
- Extended existing `/etc/letsencrypt/renewal-hooks/deploy/50-bloli-nearby-nginx-reload` to Transit, retaining all four other app domains, mode755 and test-before-reload semantics. All five renewal dry runs passed separately with deploy hooks; logs `transit-rollout-renewal-DOMAIN.log`.
- Activated final HTTPS vhost only after validated counts, verified post-import backup and native Host-specific S-Bahn/readiness checks; `nginx -t` and graceful reload succeeded, public HTTPS returned200 with valid domain certificate. Certificate expires2027-01-25T17:42:03Z. Operator probes use native `node:http`; Node fetch can ignore a custom Host header.
- Refresh timer resumed and active; next scheduled refresh2026-11-01around03:35CET. `snap.certbot.renew.timer` active. Completed import and source-probe helper containers removed after saving logs. Executed one-off scripts retained privately in `logs/transit-rollout-scripts/`.

## Explicit legacy-volume cleanup

- Owner requested removal of unused old Loo volumes during this rollout. Rechecked zero container references to both old volumes and actual DB/import mounts to generic volumes; reverified the current backup’s pg_restore listing.
- Removed exactly `find-a-loo_postgres_data` and `find-a-loo_import_data` at `2026-10-27T18:49:26Z` using `docker volume rm`. Active data/import unchanged.
- Evidence: `logs/legacy-loo-volume-cleanup.txt` and `logs/legacy-volume-cleanup-backup-toc.txt`. Generic volumes remain. Current rollback uses verified dumps/images/configuration; deleted copies cannot be rebound. Updated storage and volume-migration guidance accordingly.

## Verification and rollback notes

- Final local unit56, Python importer37, isolated PostGIS14, Chromium34 and WebKit20 checks passed; production build passed. Inspected Transit phone/desktop layouts, including all locales and mapped-only reference behavior.
- Fresh review found exit-only entrances, negated-only modes/monorail mapping, excluded-scope PT fallback and inherited inactive-parent bypasses. Reproduced RED, fixed and verified GREEN, with no outstanding important/critical or deferred minor findings.
- Small separate sample DB preserves previous development data and contains6WC/8tobacco/8kebab/8water/16Transit components/2settlements. Temporary local API/Vite/test services and local DB are stopped afterward, data retained.
- Do not run a four-category importer after Transit activation. Pause refresh before incompatible rollback. To restore a pre-Transit dump, use a freshly created separate database and verified matching app images; an older dump cannot safely clean a newer schema’s unknown `transit_components` FK. Keep current DB/backups until rollback verification completes.
- Final live all-five-site browser/API verification passed: native profile/shell/readiness, actual map tiles, directions, 0.5km default,320/390/430px DE/EN/RO layouts without horizontal overflow and zero page errors. Transit train/S-Bahn/subway/tram/bus/taxi API filters passed; unsupported fee/seller/Open-now parameters rejected. Evidence `logs/transit-production-final.json`.
- Updated the GitHub repository description through the owner’s Firefox session to include all five discovery categories.
- No datasets, dumps, fonts/screenshots, built output or secrets were pushed to Git. Source fixes committed as `1ed4f73` and `5c5ee0f`; final protocol/operating docs committed separately and synchronized to VM. Country expansion stays on hold.
