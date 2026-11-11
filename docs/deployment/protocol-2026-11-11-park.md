# Park rollout — 2026-11-11

Status: implementation and release verification in progress. User approved `park.bloli.com` and created its DNS record. Existing authorization includes main-only GitHub/GHCR releases, Contabo TLS and new-site data imports.

Park adds mapped car parks in Germany, Romania, Austria and Hungary using the existing shared app. It includes four languages, fee/type/access/Park & Ride/hiking filters, mapped opening hours, driving directions and clearly labelled total capacity. Explicitly associated vehicle entrances are used where available. Unknown prices, access and restrictions remain unknown; no live space availability is claimed.

## Preflight and TLS

Production was clean at `1ef0259f6e2dbd773db723be39eafafb88b3f513`, with the prior eleven-site release marked successful and host-verified. API, web, PostGIS and Grafana collector were running; weekly refresh service inactive and timer active. DNS A resolves to `173.212.194.159`.

Installed the dedicated Park HTTP challenge vhost and issued its certificate through the existing Snap Certbot account/webroot. Certificate expiry: **2027-02-09 12:55:08 GMT**. Installed the dedicated HTTPS vhost and extended the scoped renewal hook. Configuration checks passed before graceful Nginx reloads. The scoped certificate renewal simulation and deploy-hook check passed.

Evidence: `/home/oliver/stack/bloli-nearby/logs/park-20261111/`. Prior renewal hook retained under `backups/park-20261111/renewal-hook-before`.

## Verification and rollout

The local container runtime is waiting on its initial setup screen. Local unit, extractor and production-build checks run normally; real PostGIS and browser verification use GitHub's existing disposable CI database and browsers. The implementation release retains the eleven already-live sites in permanent deployment checks until Park's four country snapshots are published.

The retained-source controller follows the Vend procedure, with parking floors `MIN_{DE,RO,AT,HU}_PARKING`, pre-import restore-list verification, shared operation lock, refresh-timer restoration, measurement-only counts, exact JSONL hash checks, and original membership/source metadata comparisons. Actual release, import and live-check results are recorded below as they complete.

Initial implementation `e3f3de3` passed unit/build checks but CI integration stopped on a test-order assertion: the newly tested rejected parking import became the latest refresh before an existing success-count assertion. `d1ee122` moves that deliberate failure after the success check. Deployment was skipped for the failed run. The product API/filter assertions preceding it passed.

Local checks: production build, 134 unit checks before the additional access-precedence regression, 61 Python extractor checks, and 24 final focused unit/locale/shell checks passed. Four mocked Park browser cases passed at 320/390/430/1440px, each exercising all four locales, filters, entrance routing and height restrictions. The mobile layout was visually inspected. Independent review found two issues (vehicle-specific customer access and entrance height visibility); both were corrected and covered by regressions before release.


The next CI run passed integration but stalled downloading Ubuntu browser dependencies from the Azure mirror. Switching to the official archive mirror also retried downloads. Release `860afbe` replaces per-run apt/browser installation with the official Playwright 1.64.1 Noble image, pinned at manifest `sha256:2f05f8a734509a7b3f26a912639488ee08f58a7b292d14d62271bcff9038768f`. Both CI and production browser scripts run in this container, preserving the existing test gates. Workflow [43036786182](https://github.com/orailean/bloli-nearby/actions/runs/43036786182) passed its complete check job and proceeded to image publication.
