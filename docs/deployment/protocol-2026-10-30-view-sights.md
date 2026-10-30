# View and Sights rollout — 2026-10-30

Status: deployed and verified. Both `https://view.bloli.com` and `https://sights.bloli.com` are live with all four countries ready. User authorized site deployment, certificates, production imports and a single verified database-backup retention policy on Contabo (`ssh-contabo`, `oliver@173.212.194.159`).

## Release and scope

- Application release: `376e0ff70ef652a397364f8c9ea6b6c6e37c1981` (`Add View and Sights tourist discovery sites`), fast-forwarded and pushed to `main`.
- Previous production revision: `beb209aa0ac7596fa5a7042e4ce598a67cbc6875` (eight-site analytics rollout).
- New domains: `view.bloli.com` and `sights.bloli.com`; both A records point to `173.212.194.159`, with no AAAA answers at preflight.
- Shared checkout `/home/oliver/stack/bloli-nearby`, Compose project, API/web/PostGIS, data volumes, ports and existing Docker Nginx are retained.
- View uses analytics token `66e9fa7dd6aa48dea133dfb9a1611a12`. Sights has no assigned analytics token; its shell omits the beacon.
- Local verification: 93 unit checks, 52 Python extraction checks, 17 PostGIS integration checks, 40 multi-site browser cases, production build and independent review passed. Browser cases cover four languages and widths 320/390/430/1440px.

## Preflight and rollback

- Production checkout was clean at `beb209a`; API/web/PostGIS were healthy. Free disk was about 515 GiB.
- The active `bloli-nearby-refresh.timer` was stopped before rollout. Refresh service was inactive; daily backups were not changed.
- Private rollback material: `backups/view-sights-20261030/` contains the previous revision, scheduler state, `.env`, resolved Compose config, Nginx config copy, certificate archive, renewal hook and database backup verification output. These files stay on the VM, outside Git.
- Previous images are retained as `bloli-nearby-{api,web,importer}:pre-view-sights-20261030`.
- Pre-rollout database backup: `backups/bloli-nearby-20261030T145341Z.dump`. SHA-256: `8846982ad93c33f911955500262432e4c91002e69d5a7bec9bb568ba2d835b48`. `pg_restore --list` passed before deployment.
- Baseline country/category membership counts, sorted identity MD5 fingerprints, dataset timestamps and source provenance: `logs/view-sights-20261030/before.json`.
- The VM's GitHub key had failed during the preceding analytics release, so the already-pushed release was transferred as a verified incremental Git bundle, fetched locally and fast-forwarded. Git credentials were not changed.

## Application and TLS

- Built new API, web and importer images and recreated API/web through the retained production Compose configuration. All three shared services became healthy; additive schema changes retained the existing datasets.
- Installed only the two new HTTP bootstrap vhosts in the existing Docker Nginx. A probe immediately after graceful reload returned a transient 404; both probes returned the expected HTTP 200 content after the new workers loaded.
- Issued both certificates through the existing Snap Certbot account and HTTP-01 webroot `/var/lib/dehydrated/acme-challenges`.
- Certificate expiry: View `2027-01-28 13:57:47 GMT`; Sights `2027-01-28 13:57:57 GMT`.
- Installed both dedicated HTTPS vhosts and extended `/etc/letsencrypt/renewal-hooks/deploy/50-bloli-nearby-nginx-reload` to all ten domains. Nginx validation passed and the existing proxy was gracefully reloaded. Warnings concern pre-existing unrelated vhosts.
- Initial renewal dry run was blocked by an unrelated automatic `/usr/bin/certbot -q renew` instance. After it finished, both scoped renewal dry runs passed. The ten-domain deploy hook was then invoked with the two new domains; Nginx validation and graceful reload passed.

## Importer correction discovered during production validation

The first Germany measurement stopped during geometry preflight, before emitting/publishing a complete dataset: `Incomplete sights geometries: 19`. Inspection of the exact retained source found grouped buildings with unroled parts, nested castle/site relations, bridge outlines and artwork groups, as well as logical networks, person-based memorial collections and historical waterways that are not single nearby destinations.

Correction `742955e7786ec4c5ca4d6cc9c0d82fec5f933bbb` adds bounded recursive member reconstruction for physical tourist relations, prefers bridge outline/across members, and explicitly excludes unsupported logical relation kinds from tourist candidates. The missing-geometry guard remains fatal for qualifying physical features. Original eight-category candidate rules remain unchanged. New regression cases failed before the correction and passed afterward; all 54 Python checks, targeted normalizer checks, build and independent review passed. The corrected images were deployed and the controlled rollout restarted, reusing the completed filtered source. Initial failure evidence remains in `de-measure-first-attempt.log` and `controlled-rollout-first-attempt.log`.

## Controlled retained-source publication

Following the [ATM/Stay protocol](protocol-2026-10-29-atm-stay.md): measure each retained source with `USE_RETAINED_SOURCE=1` and `MEASURE_ONLY=1`; review unchanged original category counts; set new floors to 80% of eligible normalized counts, rounded up; SHA-256 the emitted JSONL; publish that exact file without rerunning source preparation; compare the post-publication hash and every original country/category membership count and fingerprint.

Source snapshots retained at preflight:

| Country | Source                   |
| ------- | ------------------------ |
| Germany | `germany-261025.osm.pbf` |
| Romania | `romania-261027.osm.pbf` |
| Austria | `austria-261027.osm.pbf` |
| Hungary | `hungary-261027.osm.pbf` |

The sequential helper and logs are on the VM. Germany, Romania and Austria completed measurement and exact-file publication, preserving every original category’s membership count and fingerprint. Hungary’s first attempt stopped in schema setup with PostgreSQL `40P01` (deadlock), before source preparation/publication. A Hungary-only retry at 19:23:57 UTC avoided repeating the three completed countries; measurement and exact-file publication passed. Final Hungary identity verification completed at 19:32:49 UTC, and the controller emitted `DATA_ROLLOUT_COMPLETE`. All 40 country/category snapshots are now published, and all 32 original membership counts/fingerprints are preserved. The failed attempt is retained in `hu-measure-first-deadlock.log`.

| Country | View count / floor | Sights count / floor |
| ------- | -----------------: | -------------------: |
| Germany |    32,768 / 26,215 |    155,282 / 124,226 |
| Romania |      1,259 / 1,008 |        6,828 / 5,463 |
| Austria |      5,689 / 4,552 |      17,419 / 13,936 |
| Hungary |      3,099 / 2,480 |      18,110 / 14,488 |

Measured results and floors are retained in `{de,ro,at,hu}-measurement.json`; country logs, exact JSONL SHA-256 checks and identity comparisons remain under `logs/view-sights-20261030/`. No original dataset is replaced by measurement-only staging.

## Backup retention preference

The user requested keeping only the latest useful database backup. Backup policy commit `ce761d511f9ecf90b63b7f436143b428d8a694bc` was pushed and deployed. The backup script now structurally checks the new archive with `pg_restore --list` before renaming it into place and removing older generated database dumps. Failure leaves the preceding dump intact, unrelated files are untouched, and a newer dump from another invocation is not removed. An exclusive directory lock serializes backup creation before timestamp/temp-file selection, addressing the reviewer’s concurrent-filename-collision finding. Three regression checks cover successful pruning, failed-verification retention and refusal of an overlapping backup. The pre-rollout dump is kept until final publication/live verification succeeds and the post-rollout dump is verified. Configuration/secrets and rollout evidence are retained separately.

## Completed release gate

- All four measurements, exact-file publications and original identity comparisons passed.
- Both renewals and the ten-domain reload hook are verified.
- All ten HTTPS sites passed the live API/browser gate, including country readiness/searches, type filters, map tiles, four languages, phone layouts and no page errors.
- The post-publication backup and restore listing passed, obsolete database dumps were removed, the previously active refresh timer resumed, and API/web/PostGIS are healthy with no rollout helper container remaining.

## Exact measured JSONL artifacts

| Country | SHA-256                                                            |
| ------- | ------------------------------------------------------------------ |
| Germany | `8d3b438c4ea141895a7e15e235008e3d0d4b512915a3432a5f7e3f75e6fb30dd` |
| Romania | `e762565a05847a29827b9fa931367b6cd3ffde1b5baa9955d6a7b32e2356988a` |
| Austria | `01cf26dacec3374b071260f3c6e30f7c7c054e4c47a67224a84a48c2fa0d916a` |
| Hungary | `967d328bbf835f346918d153070ff7c2bfe53ac163c31a918b75855299cf83eb` |

Each hash was checked unchanged after publication. Normal future scheduled refreshes use the latest upstream country snapshots; `USE_RETAINED_SOURCE` and `MEASURE_ONLY` were not persisted in `.env`.

## Live verification

`node scripts/check-multi-site-production.mjs` passed for all ten public sites. Report: `logs/view-sights-20261030/live-verification.json` on the VM. Both new sites report all four countries active and ready; the script checked four-country nearby results, canonical shells, real map images, mapped-hours controls, walking directions and four-language phone layouts without browser page errors.

Public unique counts: **View 42,660**, **Sights 197,259**. These are lower than summed per-country membership counts because cross-border OSM identities are deduplicated. Munich 5km probes returned six View results and 100 Sights results (the shared result cap). Germany’s retained source timestamp remains 2026-10-25 21:21:21 UTC; RO/AT/HU remain 2026-10-27 21:23:59 UTC.

The release’s final local suite passed 97 unit checks; extraction regression coverage passed all 54 Python checks after the relation correction. The earlier 17 PostGIS integration checks and 40 responsive browser cases passed before deployment.

## Retained backup, cleanup and normal operations

The only retained database dump is:

```text
/home/oliver/stack/bloli-nearby/backups/bloli-nearby-20261030T193458Z.dump
```

Size: **351,185,858 bytes**. SHA-256: `16ab7e5b697b85ba07ae3d10f49f444529368963423e12bf44fb3da4443f6ad3`. Both the backup script’s pre-publication archive check and the separate post-backup `pg_restore --list` passed. The pre-rollout dump documented above and older generated dumps were pruned only after this replacement succeeded; the two legacy Loo dumps were then removed. `remaining-database-backups.txt` confirms exactly one database dump remains. Historical backup paths above are audit evidence, not retained restore points. Configuration/secrets archives and rollout logs remain separate from database-dump retention.

Backup path, hash, restore listing and legacy cleanup evidence are retained under `logs/view-sights-20261030/`. Future daily backups use the same verify-before-prune rule and concurrency lock. Weekly OSM refresh is not a substitute for a backup; the chosen single-dump policy is appropriate to the rebuildable source data but intentionally gives up older restore points.

`bloli-nearby-refresh.timer`, `bloli-nearby-backup.timer` and `snap.certbot.renew.timer` are active. The next refresh at completion is Sunday 2026-11-01 03:16:41 CET. API, web and PostGIS are healthy; no `bloli-tourism-*` helper remains running. The production checkout is on main with importer correction `742955e` and backup policy `ce761d5`; the final protocol-only revision is fast-forwarded afterward without restarting application services.

View’s delivered shell was checked against token `66e9fa7dd6aa48dea133dfb9a1611a12`; Sights was checked to have no beacon until its own token is provided. All eight prior site tokens remain configured independently.
