## Context

The owner selected `transit.bloli.com` for finding the next train station, U-Bahn, S-Bahn, tram, bus, taxi and other public transport. DNS currently resolves to the existing VM. Four sites already share one host-bound React/API/PostGIS/import stack with source-only Git, atomic category publication and generic Docker resources. Transit adds a fifth profile; Germany remains the active coverage and the multi-country proposal stays on hold.

OSM transport data is not one uniform point tag. Legacy stations/stops coexist with platforms, vehicle stopping positions, entrances, stop_area groups and route relations. Transport modes and S-Bahn identity often live in related objects. Displaying every object independently would duplicate stations; equating light rail with S-Bahn would misclassify services. This design deliberately addresses those contracts before implementation.

## Goals / Non-Goals

**Goals:** Discover nearby mapped passenger boarding/pickup locations, filter by mode, understand interchange options and walk to a suitable mapped location. Preserve source evidence, unknown information and existing-site behavior. Give Transit a distinctive identity using free dependencies/data and the existing infrastructure.

**Non-Goals:** Live departures/delays, timetables, trip planning, fares, ticket purchase, live taxis/shared vehicles, inferring service frequency or current operation, a new database/stack, country expansion, shared-bike/scooter stations, car-sharing, airport/aircraft facilities, new host ports or paid APIs. Mapped route labels are descriptive service context, not a promise that a vehicle is coming.

## Decisions

### Approaches: a shared static discovery profile

Extend the existing platform with category/site `transit`. This fits the owner's shared-app approach and keeps operations coherent. A separate transport stack duplicates source and maintenance. A live journey planner needs timetable/realtime feeds, licensing, caching and routing infrastructure that the owner has not requested. Keep that as a separate future capability rather than giving static OSM features departure-like labels.

Use `transit.bloli.com` and `transit.localhost:5173`, with explicit bindings in API, Vite, gateway and generated initial HTML. Retain one database/login, generic volumes/images, Docker Nginx and systemd/Certbot schedules.

### Passenger location classification and mode evidence

Baseline mode registry: `train`, `suburban_rail` (S-Bahn), `subway` (U-Bahn), `tram`, `light_rail`, `bus`, `trolleybus`, `taxi`, `ferry`, `cable`, `funicular`, `other_rail` and `other`. A place can carry several modes. The owner explicitly selected rail, bus, taxi, ferry and cable/funicular scope; shared bikes/scooters, car-sharing and airports are excluded.

Include active passenger `railway=station/halt/tram_stop`, `highway=bus_stop`, `amenity=bus_station/taxi/ferry_terminal`, `aerialway=station`, and public_transport stations/platforms with explicit mode or mapped passenger context. Retain unclassified genuine passenger stations/platforms under Other. Exclude track/road geometries, pylons, freight-only infrastructure, bus depots, taxi company offices, unrelated buildings, private/no/military access, construction/disused/abandoned/removed features and inactive lifecycle forms of every accepted source key. Fare-paying passenger/customer access is valid and disclosed, not treated as a free/public-access promise.

Apply explicit mode=no exclusions before enriching from relations. Legacy specific tags supply their documented mode; generic railway stations default to train only when no mapped subtype contradicts it. U-Bahn needs subway evidence, not any underground=yes feature. Keep light rail independent of S-Bahn. S-Bahn requires explicit mapped S-Bahn service/operator/network evidence or a verified train-route reference/network mapping. The builder must verify initial German network/reference rules against actual source examples (München, Berlin and Hamburg) and document the allowlist/evidence; arbitrary station names or an S-prefixed name alone never qualify. Unresolved cases retain their supported broader rail mode.

Preserve operator/network, source links, mapped line references, local platform references, wheelchair, shelter/bench/covered and access hours where present. Do not invent destination/direction from route endpoints or infer wheelchair suitability for the entire interchange from one accessible platform. Keep generic stations' facility access hours separate from vehicle availability.

References: [OSM public transport](https://wiki.openstreetmap.org/wiki/Key:public_transport), [platforms](https://wiki.openstreetmap.org/wiki/Tag:public_transport=platform), [stations](https://wiki.openstreetmap.org/wiki/Tag:public_transport=station), [light rail](https://wiki.openstreetmap.org/wiki/Key:light_rail), [ferry terminals](https://wiki.openstreetmap.org/wiki/Tag:amenity=ferry_terminal).

### Relation context without importing route paths as places

Add a transport-specific relation-context pass/sidecar for stop_area membership and passenger route mode/network/ref metadata. Bind its cache to the same verified source checksum and extraction version. Keep it bounded/on-disk where necessary and measure memory/runtime against the existing2CPU/4GiB importer limit.

Do not recursively include every road/track member of bus/train route relations in the geometry extract. Route metadata and member references supply context only; the existing location/geometry extract retains boarding/station features plus their needed geometry references. This avoids turning a compact POI extraction into a national road/rail graph import. Keep the existing exclusion of routes as toilet/seller/food/water locations.

Preserve normal shared source identities in stored raw Transit records. Required fixed boarding geometry failures must fail publication with source diagnostics. Missing optional enrichment/member context produces explicit diagnostics and conservative ungrouped/unknown results; it must never silently remove valid independent locations.

### Logical stop grouping and distance

Use explicit direct `public_transport=stop_area` membership to group related station/platform/stop components. Do not merge unrelated same-name places or use proximity alone. Do not collapse a stop_area_group containing several stations into one city-wide result. Ambiguous multiple direct parents remain ungrouped with diagnostics until a deterministic source-backed relationship is available.

Store group membership/enrichment as additive Transit-specific data alongside raw source locations, and publish it in the same transaction as the five categories. A grouped result has a stable group key from its stop_area relation; an ungrouped result uses its raw source key. The query response is a derived discovery projection: raw source identities/coordinates remain intact, while displayed group coordinates and distance come from the nearest eligible component for the selected mode. Expose the selected component identity and group provenance explicitly; do not overwrite globally shared OSM geometry with query-dependent coordinates.

Apply mode/access/radius eligibility to members before grouping, then choose nearest eligible component, order logical results and apply the100-result cap/truncation flag. A station centroid outside the radius must not hide a platform inside it. Display the same projected group/result on map and list. Preserve distinct ungrouped opposite-direction stops; grouped details list their individually mapped platform/local references.

Vehicle stop_positions are enrichment/deduplication context, not separate destinations when related passenger-facing features exist. If the only mapped feature is a vehicle stop_position, allow a clearly labelled approximate reference result with no walking-directions link; do not route a person onto tracks or a carriageway as though it were a platform. Passenger-facing platforms and mapped usable entrances are preferred directions targets; otherwise a normal mapped station/legacy passenger stop can be an approximate station destination with that disclosed. Entrances inherit only explicitly related station mode context and do not become extra station results.

Mapped usable public entrances are eligible for radius inclusion and nearest distance, alongside passenger platforms, when their relationship and mode context are explicit. Select the nearest of those eligible passenger-facing components; use the same component for distance, marker and walking target. A legacy/normal station representative is an approximate fallback only when no usable entrance/platform for that mode is mapped for its group; an in-range centroid must not overrule known access components that are all out of range. A mode-appropriate entrance inside500m therefore qualifies even if every platform is outside500m. Conflicting/restricted entrance context does not qualify. This settles the fresh builder review's only material question as a builder decision consistent with finding the nearest usable station access.

Station result metadata can show all mapped interchange modes, while the selected mode's distance/destination must refer to an eligible component. Show only source-backed line references, bounded with an explicit additional-lines indication if truncated. Raw category status counts describe stored mapped transport locations; search result counts describe grouped nearby stops/stations. Label those concepts separately.

### Query/UI capabilities

Add a validated single `mode` filter (`all` default). Reject mode filters on the other four hosts, and reject Transit fee/seller/Open-now parameters. Transit has `openNow=false`; make the shared toolbar/request construction respect this capability while preserving the four existing sites' behavior. Access opening hours remain visible in details with a clear label; they do not tell a traveller when the next train/bus runs.

Use a labelled native mode selector on phones and desktop rather than a long row of mode buttons. Multi-mode badges on results convey interchange options, using icons/text as well as color. Keep shared location/town/postcode search, München81243 example, German fallback, separate DE/EN/RO, 0.5 km default,0.5/1/2/3/5km radii, natural mobile list scrolling and map/list selection synchronization. Mode changes refetch the same centre/radius and recompute grouped distances.

### Visual direction: the neighbourhood wayfinding board

The owner approved this design on2026-10-27.

- Palette: station silver `#F2F5F6`, white `#FFFFFF`, ink `#172D35`, signal orange `#D94A16`, route teal `#007B7F`, ticket yellow `#FFE7A8`. Mode badges can use a small accessible semantic palette, always with text/icons.
- Type: existing locally bundled Rubik for compact strong station-sign headlines/wordmark; DM Sans for controls and details. No external font requests.
- Memorable element: original SVG friendly train/bus front integrated into a branching route diagram, with an inset destination sign that says “transit” rather than displaying fabricated departure times. Compact logo: route node plus vehicle silhouette.
- Layout: clear header, left-aligned search hero, thin route-line divider, compact mode/radius toolbar, map and stop list, mapped detail panel and footer. Result rows read like concise stop signs, with mode badges and platform/local references; keep the map and primary search action prominent.
- Motion: a short vehicle arrival/node pulse on search and a route-line draw on selecting/expanding a stop. No ticking countdown, continuous vehicle movement or flashing board. Honor reduced motion and keyboard focus.
- Copy proposals: “Your next stop. A short walk away.” / “Der nächste Halt. Dein nächster Schritt.” / “Următoarea stație. La câțiva pași.” Use “nearest” to mean mapped straight-line distance; directions remain an explicit external walking action.

Inspect real desktop and320/390/430px screenshots in every language with long names, multi-mode hubs and platforms. The subject-specific wayfinding illustration and badges carry the personality; avoid decorative dashboard cards or a recolored Water page.

## Risks / Trade-offs

- [Incomplete relation context hides or duplicates stops] → Source-backed grouping only, raw standalone fallback, diagnostics and fixture/real-data tests for both legacy/PTv2.
- [S-Bahn mislabeled as light rail or generic train] → Separate mode taxonomy and verified service evidence, including München/Berlin/Hamburg examples and explicit negative precedence.
- [Grouping changes nearest-result semantics] → Filter eligible members before grouping/limiting, expose chosen component/distance provenance and test boundary cases.
- [Station access hours mistaken for running services] → No Transit Open now filter or departure-like labels; mapped access details only.
- [Route recursion explodes extract size/runtime] → Separate bounded metadata pass; no import of national route geometry; measure before rollout.
- [Fifth category breaks later refreshes] → Required-category completion/threshold validation and one transaction including Transit memberships/context; failed imports retain all active categories.

## Migration Plan

1. Record current versions/images/counts/source/mounts/timers; verify pre-change backup and private resolved config. Preserve current four sites and generic resources.
2. Rehearse classification/context/grouping on small synthetic fixtures and representative real German examples. Verify S-Bahn rules, member-distance semantics and resource use before the full import.
3. Implement additive Transit schema/profile/UI and native sample/test workflow. Build/test images including runtime ownership/static readability learned during Water rollout.
4. Deploy compatible services, pause refresh for the controlled transition, reuse the verified retained Germany PBF, regenerate transport context/filter and atomically publish five categories. Compare original four counts for the same source, choose measured Transit validation floors and verify post-import backup.
5. Reuse existing Docker Nginx ACME account/webroot for Transit TLS, extend the shared domain-scoped renewal hook, validate/gracefully reload the fifth vhost and dry-run renewals for all five app domains. No new permanent containers/ports or Nginx replacement.
6. Verify public searches for all modes, multi-mode hubs, standalone stops and phone languages; require real map tiles and all existing sites to pass. Resume/verify timers; save actual commands, counts, paths, dates and results in a dated protocol, commit/push source-only work and stop local debugging.

Rollback pauses refresh before incompatible code changes. Do not run an older four-category importer once Transit is active. Retain additive schema and generic volumes; prefer compatible images/config or restore the verified matching pre-change backup if necessary. Do not remove old rollback volumes as part of this feature.

## Open Questions

- Owner approved this concrete design on2026-10-27.
- Owner selected the focused rail/bus/taxi/ferry/cable scope; shared mobility and airports are excluded.
- Exact source-backed S-Bahn evidence rules and production minimum counts will be verified from real data during implementation rather than guessed.


## Owner refinement during rollout: unused legacy volume cleanup

The owner explicitly requested removing the unused `find-a-loo_*` volumes. This supersedes the earlier instruction to retain those rollback copies. Verified zero references, active generic mounts and a readable current backup before removing exactly the two old volumes; active generic data and the import remain unchanged. Record cleanup in the VM protocol and current storage/rollback guide. Cross-schema rollback uses a fresh restored database rather than rebinding deleted copies.
