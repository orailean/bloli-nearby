# Vend rollout — 2026-10-31

Status: complete. Vend is live in all four countries and part of the eleven-site release gate. The user requested Vend using the existing site pattern and created its subdomain. Existing authorization covers main-only GitHub/GHCR releases, Contabo deployment, TLS and new-site database imports.

## Implementation and verification

Application commit: `baa8189b1e81c50ee65fd0ca1e4b5d90da4efe32`. First staged workflow: [41212224829](https://github.com/orailean/bloli-nearby/actions/runs/41212224829).

Vend shares the app/API/database and adds explicit vending-machine classification, product/payment/public-access filters, mapped opening hours, walking directions, four locales, its own artwork/favicon and dedicated hostname shells. No Vend analytics token has been supplied. The cloud logging proposal remains separate.

Local validation: 116 unit checks, 56 Python checks, 17 PostGIS checks, 58 browser cases and production build passed. Responsive coverage includes 320, 390, 430 and 1440px widths in all four languages. An independent code review found no blocking defects. A database regression verifies the same cigarette-machine identity has Kippe's existing assumed 24/7 hours while Vend retains unknown hours. Initial local browser startup needed the configured database credentials; the complete rerun passed.

## TLS

DNS A record resolves to `173.212.194.159`; no AAAA answer was returned. Installed only `vend.bloli.com.conf` in the existing Docker Nginx configuration volume. Bootstrap and HTTPS templates are under `deploy/nginx/`; shared configuration validation passed before each graceful reload.

Issued the certificate through the existing Snap Certbot account using `/var/lib/dehydrated/acme-challenges`. Validity ends **2027-01-29 13:52:50 GMT**. The scoped deployment hook now handles Vend alongside the ten existing domains. The scoped renewal dry run and explicit deploy-hook check both passed. Previous hook retained under `backups/vend-20261031/renewal-hook-before` on Contabo.

Evidence lives at `/home/oliver/stack/bloli-nearby/logs/vend-20261031/`, including certificate issuance/renewal and Nginx checks. Existing unrelated Nginx deprecation warnings were present before this change.

## Data rollout procedure

The controller at `logs/vend-20261031/data-rollout.sh` uses the shared operation lock and temporarily stops the active weekly refresh timer. Its exit handler restores the prior timer state. It records a verified pre-import backup reference, private `.env` recovery copy, release revision and original country/category membership counts, sorted identity fingerprints and source metadata.

Countries are processed sequentially DE → RO → AT → HU using retained, checksum-verified source snapshots. Each measurement must preserve every existing category count. The new vending floor is 80% of the measured normalized count, rounded up. The controller hashes and publishes that exact JSONL, then checks its hash plus all original membership identities and source metadata. Successful country markers allow resumption without repeating completed countries.

### First attempt: DE measurement aborted

Started 17:23:12Z. The pre-import backup restore list, private `.env` copy, release record and `before.json` were recorded. The DE measurement aborted at 17:46:18Z before any publication: `Incomplete vending geometries: 8`. All eight are `vending=excrement_bags` dispensers mapped as `type=node` relations wrapping a single node (relations 3994568, 4107311, 4107312, 4669708, 6750228, 6750229, 6819062, 11804994). The exit handler restored the refresh timer. No database change occurred.

A read-only scan of the retained sources found only these eight `type=node` relations and one already-supported `type=site` relation tagged `amenity=vending_machine` in DE, and none in RO, AT or HU. Commit `cc6017e` places `type=node` relations at their member node, alongside the existing site/building handling; a regression test reproduces the production error. All 57 Python checks passed. The controller resumes from the recorded `before.json` after the fix is released.

### Second attempt: complete

Release `cc6017e` deployed and host-verified; its importer image contains the fix. The controller resumed at 18:05:04Z from the recorded `before.json` and exited 0 at 19:45:03Z with `DATA_ROLLOUT_COMPLETE`. Each country's measurement matched every original category count; after each publication every original country/category membership identity fingerprint and source metadata row was unchanged, and the published JSONL hash matched the measured one.

| Country | Vending machines | `MIN_*_VENDING_MACHINES` | Completed (UTC) |
| --- | ---: | ---: | --- |
| DE | 116,580 | 93,264 | 19:09:40 |
| RO | 765 | 612 | 19:19:27 |
| AT | 11,807 | 9,446 | between 19:29 and 19:40 |
| HU | 5,878 | 4,703 | 19:45:02 |

Floors are stored in the private production `.env`. The refresh timer was restored to active.

## Live verification

`https://vend.bloli.com/api/ready` reports `ready:true` with all four countries active and ready at the measured counts. Searches around Berlin, Vienna and Budapest return the 50-result limit within 3 km; Bucharest returns 2. `product=drinks&payment=card` returns machines with matching explicit tags; `product=pizza` returns `INVALID_QUERY`. `SITES=vend node scripts/check-multi-site-production.mjs` passed (Munich 100 results, initial HTML, map images, mobile locales, Open now control, no page errors).

## Release gates

Vend joins the host readiness loop in `scripts/deploy-production.sh` and the default `SITES` of `scripts/check-multi-site-production.mjs`. The installed `.deploy/bin/deploy-production.sh` differed from the repository only by that line before installation. 116 unit checks passed.

The initial releases (`baa8189`, `cc6017e`) retained the ten-site gate until all Vend snapshots were ready. The updated helper was installed under `.deploy/bin` (SHA-256 `cb3def43…2616`, identical to the repository) before release `6110f59` was pushed. That release host-verified all eleven sites, passed the public browser checks and finalized successfully on 2026-11-01. Its pre-deploy backup `backups/bloli-nearby-20261101T101142Z.dump` (365 MB, after the Vend import) lists all 19 table data entries through `pg_restore --list`; the pipeline already retains only this latest dump.
