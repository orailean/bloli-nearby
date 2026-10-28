# Charge deployment and data rules

Charge is the sixth hostname on the existing shared stack: `https://charge.bloli.com`, category `charge`. It uses the existing API, web gateway, PostGIS database, country-aware importer, existing import volume, tile policy, and external Nginx. No new host port, permanent container, database or Docker volume is needed. Multi-country coverage is controlled by the shared staged rollout; check `/api/status` and [multi-country operations](multi-country-coverage.md) for which countries are active.

## What counts as a charging station

The source is the retained Germany OSM PBF, filtered to `amenity=charging_station`; a station remains one result even when it is mapped as a way or relation. Individual dispenser/socket objects do not become duplicate sites. Standalone `man_made=charge_point`, parking-space charging tags, and other unsupported object types are not independently surfaced.

A read-only scan of the retained `germany-261025.osm.pbf` found 45,081 matching nodes, 2,290 ways and 40 relations before eligibility checks. Frequent socket tags include `socket:type2`, `socket:type2_combo` and `socket:chademo`; `socket:ccs` and `socket:tesla_supercharger_ccs` also occur and are recognized as CCS. Output values include unit-bearing and unitless kW forms. These are raw source-object counts, not the final eligible station count; the importer count and measured result floor are determined during publication.

Only explicit car connector tags qualify for connector-specific matches. Each connector and its mapped output power remain tied to the same socket entry; a CCS connector cannot accidentally inherit a separate Type 2 socket's output. Missing or conditional specifications stay unknown. Public, customer and destination access is represented from explicit access tags; destination/customer access is labelled. Private, permit-only, locked/key-only, conditional-access, inactive, and explicitly non-car stations are excluded. A station with unknown access may still appear under the unfiltered results, but is not described as public.

Charging fees are kept separate from parking fees. Missing and conditional tariffs stay unknown; mapped fee text is source information, not a guaranteed current price. `Accessible now` checks mapped access hours in the station's country timezone. Unknown or conditional hours are excluded and never assumed to mean 24/7. OSM does not provide live connector occupancy, charger health, guaranteed charging speed or a live tariff. Google Maps directions use driving mode and point to the mapped station location; follow local signs for vehicle access.

## Local development

Use `http://charge.localhost:5173` with the native Node API/Vite workflow and Docker-only PostGIS in [the shared development guide](../development/multi-site.md). The guarded fixture includes 12 synthetic Charge records in München and Bremen. `npm run seed:sample` refuses to overwrite any active dataset; use a new local database.

## Production rollout

Before applying this change, record the current commit, all five existing category counts/readiness states, volume mounts, source URL/checksum, running import and backup schedule. Verify a fresh custom-format backup with `pg_restore --list`. Keep the weekly timer paused during the initial six-category replacement.

Confirm `charge.bloli.com` has an A record for `173.212.194.159` and no conflicting AAAA record. Build compatible API/web/importer images. The schema change is additive and adds Charge to supported categories and import job counts. Do not change the active source or the shared database/login.

The importer first runs a **geometry-only preflight** across all six categories. It must confirm complete required geometry before starting the full serialized extract. It then reuses the retained, checksum-matched Germany PBF and Transit SQLite sidecar, derives the combined six-category extract and atomically publishes only after all minimum/count/coverage checks pass. Keep the earlier five active datasets untouched on any failure. The importer now needs temporary disk space for a new filtered PBF and extract; monitor free space, `docker stats`, importer logs and PostGIS memory during the run. Do not delete the retained PBF or context sidecar.

Set `MIN_CHARGE_STATIONS` from the measured eligible station count with a conservative bootstrap floor; never lower the other category minima or `MIN_IMPORT_RATIO` to force publication. Verify all five previous counts are unchanged for the same source snapshot, Charge count is plausible against the source probe, all six categories are ready, and `/api/status` reports the intended Germany source snapshot. After publication, run `ANALYZE` and confirm it completed. Take and verify a post-import backup before enabling the weekly timer again.

### Add Charge to the existing Docker Nginx

The shared Nginx stays in its existing container/config volume. Apply the provided [HTTP bootstrap](../../deploy/nginx/charge.bloli.com.http.conf) first, validate with `docker exec nginx nginx -t`, then gracefully reload using `docker exec nginx nginx -s reload`. Confirm the ACME webroot challenge over HTTP. Reuse the current Certbot account and webroot to issue only the `charge.bloli.com` certificate; install the supplied [HTTPS vhost](../../deploy/nginx/charge.bloli.com.https.conf), validate and gracefully reload. Both site vhosts and the main Kippe/Loo vhosts include the same `bloli-nearby-proxy.inc` upstream block.

Update the existing domain-scoped renewal deploy hook to [the repository hook](../../deploy/letsencrypt/50-bloli-nearby-nginx-reload), install it executable, and verify dry-run renewal/deploy hooks for all six lineages. Keep unrelated Nginx hosts and certificates unchanged.

After TLS is ready, verify `https://charge.bloli.com` serves the Charge shell, `/api/site` resolves `charge`, `/api/ready` reports Charge ready, and a München search returns eligible records. Check connector/power same-socket combinations, customer access labels, fee/open-hours filters, translated German/English/Romanian controls, real tile image loads, and driving directions. Also verify all five existing hosts and tile images. Save exact times, backup names, old/new category counts, source fingerprint, file sizes, import duration/resource use, certificate lineage, Nginx reload result and public checks in `docs/deployment/protocol-YYYY-MM-DD-charge.md` and the VM's project directory. Then resume the existing timer.

## Routine updates and rollback

Use [the regular production update procedure](production-updates.md) to deploy application code. Use the existing weekly refresh service for all six categories; do not run a legacy five-category importer after Charge has been published. See the [map data storage guide](data-storage.md) for the retained `/data/source.osm.pbf` and `/data/transit-context.sqlite` paths; these are not rendered map tiles.

For rollback, pause the shared refresh timer first. Prefer a compatible code rollback that still understands all six active categories. Do not restore a pre-Charge five-category dump over the current schema with `pg_restore --clean`; restore it into a fresh separate database, verify it, and switch the application only with compatible older images and importer paused. Preserve the active volume and a fresh post-Charge backup until rollback is fully verified.
