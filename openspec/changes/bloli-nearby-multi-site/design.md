## Context

Find a Loo currently serves one React/Vite frontend through a Docker gateway and Node API, backed by PostGIS. Its importer retains the full 4.6 GB Germany PBF but extracts only toilets, places and postcodes. Existing Germany data, TLS, timers, local native debugging and mobile fixes must survive the extension. The owner approved the umbrella name **Bloli Nearby**, repository **bloli-nearby**, and a second distinct site at kippe.bloli.com. Kippe includes machines and other mapped places to buy cigarettes.

## Goals / Non-Goals

**Goals:** One codebase, frontend build/gateway, API, database and source-download pipeline; distinct domain identities; reusable search with category-specific controls; safe rename and deployment; native two-domain debugging and regression coverage.

**Non-Goals:** Self-hosted raster tiles, paid APIs, inventory guarantees, assuming all petrol stations sell tobacco, a CMS/admin interface, independent per-site infrastructure or a general plugin framework.

## Decisions

### 1. Domain profiles over duplicate apps

Use an explicit server-side mapping from normalized hostnames to `loo` and `kippe`. Preserve the original Host through both Nginx layers. Reject unknown production hosts rather than silently serving Loo. Do not trust arbitrary forwarded-host headers. `/api/site` returns the resolved profile/capabilities; discovery derives its allowed category from that same profile and rejects attempts to select another site's category through query parameters.

Both domains reach the existing gateway and API, without new public application ports. The shared build contains separate generated HTML entry shells for each site (title, description, canonical URL, social metadata and favicon) and shared versioned assets. Gateway host routing selects the matching shell for initial/deep links; this avoids wrong branding before JavaScript runs. API responses remain uncached across hosts, and site profiles are validated against an allowlist.

Alternative: one deployment per domain is simple initially but duplicates resources and encourages application drift. A single page with a runtime color switch alone is insufficient for correct initial metadata and a distinct identity.

### 2. Shared components with small site modules

Keep map, location/postcode search, radius, results interactions, directions, language handling and accessibility under shared frontend modules. Put each site's profile, hero/illustration, theme tokens, content and category-specific details/filters under `sites/loo` and `sites/kippe`. Use separate shared/site DE/EN/RO JSON dictionaries with key-parity tests and German fallback. Do not mix language strings into TypeScript components.

Preserve Loo's green/yellow identity. Give Kippe a distinct kiosk/vending-inspired visual direction with its own typography/color accents and illustration, while retaining recognizable search layout, radius controls, map pins, footer and interaction patterns. Use the installed frontend-design guidance during implementation; inspect real desktop and phone renders in all three languages. Keep playful motion and reduced-motion handling. Avoid adding arbitrary site conditionals throughout shared components: profiles compose the required filters/detail renderers.

### 3. Generic data with category membership

Use shared OSM location identities (`node/id`, `way/id`, `relation/id`), geometry/provenance/tags and category memberships with category-specific attributes. A source object can belong to both toilets and tobacco sellers without overwriting either meaning. Share settlements/postcodes. Add category-aware dataset metadata, import counts and readiness; WC success cannot mask an absent Kippe import. Preserve existing WC tables/read compatibility until the migration and rollback window close.

Introduce a site-scoped `/api/locations` discovery endpoint; preserve `/api/toilets` for the Loo transition. Category membership is enforced in SQL before distance ordering and result limiting. Spatial queries remain indexed. Fee applies only to toilets; seller type applies only to Kippe. Unsupported filters fail validation. Shared radius choices are 0.5/1/2/3/5 km with 0.5 km default, maximum 100 returned matches and explicit truncation. Open now retains the existing conservative Europe/Berlin schedule evaluator and evaluates before the result cap; machine hours missing from source default to visibly labelled assumed 24/7 per the owner's subsequent instruction; explicit schedules and access restrictions take precedence.

### 4. Evidence-based seller extraction

Extract vending machines with a semicolon-tokenized `vending` value containing `cigarettes`, tobacco shops (`shop=tobacco`), and retail shops/petrol stations with explicit positive `tobacco` or supported `sells:tobacco` evidence. Broad tobacco tags indicate mapped tobacco sales, not confirmed cigarette brands or live stock. Exclude explicit negative evidence, inactive lifecycle features and private/inaccessible venues. Treat aliases and product lists through a documented tested classifier, not name matching.

Classify sellers into machine, shop and petrol station for initial filters; Lotto outlets, kiosks, convenience stores/Spätis, supermarkets and newsagents are included by the owner’s requested sales assumption. Per the owner's approved extension, all active fuel stations are included, assuming cigarette sales without a special label where source evidence is absent; explicit negative sales tags remain excluded. Preserve mapped payment methods, operator/brand, opening/access information and source dates; missing payment or hours remain unknown. Distinct mapped machine and shop objects remain separate, while repeat imports of the same source/category deduplicate.

Extend the extraction filter and geometry handling for relevant nodes, ways, areas and fixed site relations. Reuse the retained full Germany PBF after integrity verification, explicitly pinning its recorded dated URL for the first extension import to avoid an unrelated latest-snapshot download. Rebuild the filtered extract because its category expressions change. Subsequent scheduled refreshes obtain one verified Germany source for all categories.

Stage all data, validate per-category counts/drop ratios and shared settlements, then publish the coherent snapshot transactionally. A failed new-category extraction or validation leaves the complete previous active dataset, including WC data, intact. A distinct category is not ready until successfully published. Do not copy the WC minimum-count threshold blindly onto tobacco sellers: measure the initial extract and configure documented category thresholds.

References: OSM documents cigarette machines at https://wiki.openstreetmap.org/wiki/Tag:vending%3Dcigarettes and auxiliary tobacco sales at https://wiki.openstreetmap.org/wiki/Key:tobacco. Mapping coverage is incomplete; expose provenance rather than implying an exhaustive retailer directory.

### 5. Native two-site development

Use `loo.localhost:5173` and `kippe.localhost:5173` against one native Vite/API pair and the existing Docker-only development database. Explicitly allow these development hosts and preserve host identity through the Vite API proxy. Document fallback hosts-file entries if a developer's resolver does not support wildcard localhost. Keep bare localhost mapped to Loo only in development and provide a documented development-only site override for debugging; production cannot enable query-string branding overrides.

Seed a small deterministic mixed-category sample with known open/closed/unknown hours, payment/access states and shared OSM membership; keep large PBFs and databases out of Git. Run API hostname tests and Playwright projects/contexts for both sites with mobile/desktop widths and locales, plus a production-Compose host-routing smoke test.

### 6. Rename without implicit resource migration

Rename the GitHub repository to `orailean/bloli-nearby`, update local/VM origins, package metadata, descriptions, docs and service display names. Do not rewrite historical deployment records as though legacy names never existed. Inventory and pin actual existing PostgreSQL/import volume names before any directory or Compose project rename. Use explicit external volume bindings to the verified existing volumes; rename the shared database to `bloli_nearby` and login role to `bloli` after the active import completes, per the owner's subsequent instruction; preserve the SCRAM password and object ownership through a rehearsed controlled rename.

Adopt one canonical production checkout path, `/home/oliver/stack/bloli-nearby`, while updating backup/refresh working directories and avoiding two active checkouts/timer sets. Pin the existing Compose project identity during the initial rename to avoid an accidental second stack; any later resource-name migration is explicit and separately verified. Preserve the old gateway alias temporarily while adding a generic alias. Keep existing Docker Nginx running and use validated graceful reloads only.

## Risks / Trade-offs

- [Shared release affects both sites] → Full two-host regression suite and a tagged rollback point; separate containers can be introduced later if independent release cadence becomes necessary.
- [OSM shops do not prove current cigarette stock] → Require mapped sales evidence, label source/unknown details and do not claim stock or universal coverage.
- [Generic renaming silently attaches an empty DB] → Explicit volume identity checks, backup/restore rehearsal and count/readiness comparisons before traffic cutover.
- [Kippe import failure stalls a combined refresh] → Retain both previous datasets and report the failed category; category thresholds and extraction regressions make the failure actionable.
- [Hostname differences locally versus production] → Native multi-host tests plus shared Nginx/gateway smoke checks and exact host allowlists.
- [Mobile translation/artwork regression] → Preserve prior radius/list fixes and test all locales at 320–430 px in Chromium and WebKit, with real visual inspection.

## Migration Plan

1. Record current commit, volume mounts, counts, proxy aliases, timers and certificate state; create/verify a DB backup and rollback instructions.
2. Build and verify the categorized schema/API against isolated mixed fixtures; preserve legacy WC reads during rollout.
3. Verify and reuse the recorded Germany source; stage and validate the extended import without exposing Kippe as ready prematurely.
4. Rename repository/project metadata and checkout paths with pinned Compose/volume identities; update timers and verify a single active stack/scheduler set.
5. Configure kippe DNS, shared Nginx routing, webroot certificate issuance and domain-scoped auto-renewal reload. Keep Loo certificates/routing intact.
6. Deploy the tested shared build/API; run domain-specific API/browser, data-isolation, map tile, metadata, mobile and HTTPS checks. Save commands, versions and results in a new project deployment protocol.
7. Roll back by restoring previous application/proxy/timer configuration and checkout path; retain volumes. Compatibility tables support old code during the rollback window; restore the verified backup if the schema/data migration cannot be reversed safely.

## Open Questions

No blocking product decisions remain. Implementation preflight must measure seller counts/tag distributions in the retained Germany snapshot and verify kippe DNS before certificate issuance; neither is assumed complete by this proposal.
