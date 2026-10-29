# Transit setup and operations

Transit is the fifth shared profile at https://transit.bloli.com, category `transit`. It shares existing app services, database/login and generic volumes with Loo/Kippe/Kebab/Water. No new permanent services or host ports. Coverage remains Germany; country expansion is on hold.

## Data and mode rules

Mapped passenger rail/U-Bahn/S-Bahn/tram/light rail, bus/trolleybus, taxi ranks, ferries and cable/funicular stops qualify. Private/inactive/freight-only sources, track/path geometry, rental/shared mobility and airport facilities do not. Static OSM data does not supply departures, fares, delays or live taxi inventory. Transit omits Open now; building/access hours are details only.

S-Bahn is distinct from light rail. Source route evidence includes explicit S-Bahn names/operators/brands or a train/light-rail S-number with a recognized network short code. Unknown references stay in their supported broader mode. Verified retained-source examples: München relation1773068 (MVV, operator DB Regio AG/S-Bahn München), Berlin relation1929070 (VBB, operator S-Bahn Berlin GmbH), Hamburg relation1540437 (HVV, operator S-Bahn Hamburg GmbH). Karlsruhe relation15090241 (KVV, StadtbahnS1) stays light rail; busS1 does not become S-Bahn. The allowlist is in `importer/transit_context.py`; source evidence remains in each route record.

A SQLite sidecar `/data/countries/de/transit-context.sqlite` stores only route metadata, referenced stops/platforms and direct stop_area memberships. `/data/countries/de/transit-context.source` binds it to source URL/checksum/context version; extraction checks completion/fingerprint. No route paths are imported. Refresh builds/reuses the sidecar before the compact geometry extract, from the already-verified PBF. Do not mistake this derived sidecar for another map download.

Raw components keep original OSM identity/geometry. Explicit unambiguous stop_area membership supplies grouping; names/proximity alone never merge stops. Mode filtering applies to components before radius, grouping and the100-result cap. Mapped eligible entrances/platforms supersede approximate station centroids, even across a radius boundary; mode-specific distance, marker and walking destination use the selected component. Vehicle stopping-position-only results are approximate references with no walking button. Details retain component-specific accessibility rather than promising the whole station is accessible.

## Native development and updates

Use `http://transit.localhost:5173` (or `http://localhost:5173/?site=transit`) with the existing native API/Vite and Docker-only DB workflow. The guarded sample adds16 raw Transit components across München/Bremen, including grouped entrances/platforms, standalone modes and an approximate-only reference. Use a fresh sample DB; existing saved data is not overwritten. Seed sets `MIN_TRANSIT_STOPS=1` locally; bootstrap production default1000 is separate from the existing0.75 drop ratio.

Use [production updates](production-updates.md) for app code and `scripts/update.sh` for data refresh. All five active categories and Transit context must publish atomically after activation. Do not run an older four-category importer; pause refresh before incompatible rollback and use a compatible image or verified matching backup.

## TLS and rollout

Use the existing shared Nginx include with `deploy/nginx/transit.bloli.com.{http,https}.conf`, existing ACME webroot/account and `/snap/bin/certbot`. Extend the existing domain-scoped reload hook to Transit, validate then gracefully reload Nginx, and dry-run renewal/deploy hooks for all five domains. Existing generic mounts and timer schedules remain. Save actual rollout changes, dates/counts, backup verification, resource/runtime measurements and public evidence in the dated Transit protocol.


## Cross-schema rollback

For a full rollback to a pre-Transit four-category dump, restore into a **fresh separate database** on the same Postgres instance, verify it, then switch the private production `DB_NAME` to that restored database with matching older app images and refresh paused. An older dump does not know the new `transit_components` foreign key; do not assume `pg_restore --clean` over the newer schema can remove it safely. For same-schema five-category restores, the usual transactional restore helper applies. Keep the current database and a fresh backup until the rollback is verified. The old `find-a-loo_*` volumes were removed at the owner’s request; they are no longer a rollback source.
