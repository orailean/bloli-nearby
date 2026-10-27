## Context

All three sites currently share a Germany source, PostGIS database, importer and weekly systemd refresh. Source preparation uses one `/data/source.osm.pbf`; publication replaces global category snapshots and settlements. Category metadata has a single source date/coverage. Open now sets process-wide `Europe/Berlin` and passes `country_code=de` to the parser. Merely importing Austria or Romania with another URL would replace Germany and evaluate Romanian schedules incorrectly.

Retain the generic `bloli-nearby` project/images/volumes, database `bloli_nearby`, login `bloli`, existing Docker Nginx and certificates. Native development uses Vite/API plus a Docker-only database. Existing translations are already DE/EN/RO. These are planning artifacts, with no VM changes at this stage.

## Goals / Non-Goals

**Goals:** Add DE/AT/RO coverage to every existing site; independently validated country refreshes; one identity per mapped object; country-aware search and truthful source status; correct local-time opening hours; safe rollout and documented operation. Make subsequent countries primarily a configuration/data-verification exercise.

**Non-Goals:** New domains, independent stacks/databases, country-specific branding, all-Europe download, self-hosted map tiles, paid APIs, reviews/orders, new category heuristics or additional interface languages. Keep the current Kebab cuisine rules; shawarma expansion needs a separate decision. Do not promise completeness of OSM coverage or cigarette availability.

## Decisions

### One platform with a country registry

Add a validated registry keyed by ISO country code: DE, AT, RO. Each entry supplies Geofabrik PBF/poly URLs, display names, IANA timezone, per-category bootstrap floors and refresh configuration. Reuse existing classification and extraction for all three categories. Initial sources are `europe/germany`, `europe/austria` and `europe/romania`; resolve immutable snapshots and verify checksums as today.

Use separate retained paths `/data/countries/{de,at,ro}/` inside the existing import volume, with independent source/checksum/filter/completion metadata. Reuse the verified Germany source during migration rather than redownloading it. Keep backward-compatible invocation documented only for the transition; unknown country values fail before download or publication. Separate country stacks duplicate operations; merging entire Europe increases download/processing costs unnecessarily.

### Country snapshots with globally shared identities

Introduce region-scoped snapshot metadata keyed by country/category, plus country-scoped settlement and category memberships/provenance. Preserve global OSM type/id as the shared location identity. Stage and atomically publish all three categories and settlements for one country. Validation floors, previous-count ratios and monotonic source-time checks compare only with that country's previous snapshot. Other countries remain readable and untouched on failure. Region publication and overlapping identity reconciliation run under the shared import lock.

Store source payload/version provenance per country membership so an object contributed by two extracts remains available when only one drops it. Derive the active shared payload deterministically from the newest mapped-object version, with snapshot date and stable country-code tie-breaks; if equal-version payloads materially conflict, reject that publication with diagnostics. Preserve OSM version metadata during extraction (or establish an equivalent verified ordering before coding the reconciler); reject ambiguous conflicts rather than combining contradictory coordinates/tags. Removing the final membership removes the active object; removing one membership never deletes another country's contribution. Query results deduplicate shared identities before limiting and counting.

Distinguish extract membership from physical country. Geofabrik extract polygons can include border buffers. Use versioned administrative country boundaries to assign a place's physical country/timezone; record boundary provenance. Do not treat an extract buffer as advertised national coverage. Reconcile overlapping/missing address tags against geometry, with a deterministic boundary rule and diagnostics for unresolved ownership. Reject unresolvable new records that require country identity rather than silently assigning Germany. Country membership and physical-country fields allow future refreshes without changing public IDs.

Keep aggregate category status available for existing frontend consumers, but derive it from active country snapshots. Add per-country readiness, counts, source/dataset/import times and freshness. Aggregate source date is conservatively the oldest active contributing date, not a fabricated common snapshot. A configured-but-not-yet-imported country is pending, excluded from usable coverage and shown as unavailable. One failed country refresh does not mark every site unready; operators still receive failure status.

### Country-aware discovery without artificial border walls

Default the optional settlement-search selector to “All supported countries.” Show translated country names in suggestions and include country codes in API records to distinguish matching postcodes/towns. Filter settlement suggestions when a country is selected. The selector changes search suggestions; it does not remove nearby locations across borders or silently relocate an existing search centre. Site identity continues to select category, never country. Validate country parameters independently from language/site selection.

Location and map-based radius searches use the union of successfully published national coverage and return deduplicated matching places from any supported country. Centres outside that coverage keep the explicit unsupported-area response. Maintain 0.5 km default, 0.5/1/2/3/5 km choices, map/list synchronization and natural mobile scrolling. Show country on ambiguous result addresses and country-specific update details. Make settlement matching support Romanian diacritics and common unaccented input while preserving original names. Retain German fallback regardless of selected country; browser language does not infer geographic position.

Update Germany-only hero/footer/coverage/error text across separate DE/EN/RO files and initial page metadata. Keep each site's current visual identity. Add a compact accessible selector that fits 320 px phones without overcrowding filters. Map tiles already use worldwide coordinates; no country tile download or Nginx/TLS change is needed.

### Opening hours in each location's timezone

Remove reliance on mutable process-global timezone for schedule evaluation. Pass an absolute instant plus resolved physical country, subdivision and IANA zone to a timezone-aware evaluator or an explicitly tested adapter. DE/AT use Berlin/Vienna civil time; RO uses Bucharest, including DST. Confirm the current parser can safely support per-place zones; select a maintained free alternative/adapter if required, documenting licensing and semantics. Cache parsed schedules by hours, coordinates, country, subdivision and zone, never a cached open/closed boolean.

Supply the correct country holiday context and normalize subdivisions where reliable. If a PH/SH-dependent schedule cannot be resolved safely, preserve unknown/excluded-from-Open-now behavior. Keep existing tobacco-machine missing-hours 24/7 assumption and explicit-hours precedence, without applying it to food/WCs. Unit tests must mix Romanian and German locations in the same process and at the same UTC instant, including DST and midnight boundaries.

### Refresh and local development

Keep the existing systemd refresh timer as the entry point. A bounded sequential refresh enumerates configured countries; it records and continues past individual failures, then exits nonzero if any failed. Avoid running three memory-heavy extracts concurrently. Expose targeted country refresh/retry commands with the same locking as scheduled work. Preserve weekly frequency and backup schedule; measure duration before considering staggered schedules.

Use small synthetic country/category fixtures, duplicate border identities, colliding settlement names/postcodes and DST cases. Keep production dumps/PBFs outside Git. Local tests/debug services are temporary and stopped afterward, retaining local DB data.

## Risks / Trade-offs

- [Country refactoring accidentally replaces German data] → Seed/backfill DE metadata and memberships, run real PostgreSQL rollback/isolation tests, compare existing counts and stable IDs before activation.
- [Extract overlaps or mismatched snapshots duplicate/stale records] → Per-country contributions, versioned source provenance, serialized reconciliation and deterministic conflict handling.
- [Geographic ownership differs from extract polygon] → Versioned national boundaries and explicit physical country assignment; test both sides of DE/AT border and reject unresolved cases.
- [Opening-hours library assumes server-local time] → Prove mixed-zone behavior before integration; no process-wide TZ mutation per request.
- [Sparse or inconsistent mapping] → Preserve conservative category rules and unknown data; measure actual counts before setting country floors.
- [A country falls behind while others refresh] → Per-country update/failure status and conservative aggregate freshness.
- [Source storage, staging and backups grow] → Measure real disk/RAM/runtime, serialize extracts, retain one verified source per country and bounded staging cleanup. Do not delete existing rollback volumes as part of this feature.

## Migration Plan

1. Record live counts/IDs, commit/images, source metadata, resource mounts and timer definitions. Take and verify a backup and save private resolved configuration.
2. Implement rerunnable additive country tables/fields and backfill the current snapshot as DE. Verify existing three-site behavior and equal German counts before enabling foreign data.
3. Preserve/reuse the verified Germany source under its country path. Deploy compatible API/web/importer and refresh runner; pause only the refresh timer during the controlled transition.
4. Download/verify and stage AT then RO, measure counts, set independent floors and publish each country atomically. A failure keeps DE and any successfully imported country active.
5. Verify all sites at Munich, Vienna and Bucharest plus border, timezone, search, status, translations and mobile cases. Take a post-migration backup and resume/verify the timer.
6. Document exact paths, commands, times, counts, source dates and changes in a dated VM protocol; update refresh/retry/backup/restore instructions, commit/push source-only changes and stop local debug services.

Rollback must pause the new refresh runner before switching versions. Once multiple countries exist, do not run the older global Germany-only importer. Prefer a compatible app fix/rollback retaining additive tables; if incompatible, restore the verified pre-change DB and matching code/configuration with documented downtime. Preserve all verified sources/backups and existing generic volume/database identities.

## Open Questions

- No owner decision blocks the proposal. Country selection defaults to all countries and does not restrict nearby border results.
- Implementation spikes must verify the timezone adapter, boundary source/version and OSM version propagation before finalizing schema and dependencies.
- Initial AT/RO category floors and refresh runtime must be measured from real verified extracts, not guessed from Germany.
