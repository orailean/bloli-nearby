# Tobacco seller extraction

The combined Germany source emits independent `facility`, `seller` and `settlement` records. A source can emit both facility and seller records with identical OSM identity, point and original tags. The metadata declares `categories: ["toilets", "tobacco"]`; the completion record counts every emitted category record. A complete source with no sellers therefore still declares the tobacco category so publication can reject its count rather than interpreting it as a WC-only refresh.

Supported mapped evidence:

| Tags | Seller type |
| --- | --- |
| `amenity=vending_machine` and a `vending` semicolon token equal to `cigarettes` | machine |
| `shop=tobacco` | shop |
| A retail `shop=*` and `tobacco=yes` | shop |
| A retail `shop=*` and a `sells:tobacco` token equal to `yes`, `tobacco`, `cigarette` or `cigarettes` | shop |
| `amenity=fuel` plus either of the preceding explicit sales signals | petrol station |

Product tokens are trimmed and compared in lower case. `vending=drinks; cigarettes` qualifies; `vending=e-cigarettes` alone does not. `tobacco=only`, `cigarettes=yes`, names containing tobacco/cigarettes and arbitrary `sells=*` product tags are not currently supported positive evidence. A generic kiosk, supermarket or petrol station never qualifies without the evidence above. No brand, current stock or age-verification method is inferred.

Python extraction deliberately retains candidates with contradictory, private or inactive tags, preserving their tags for the final Node classifier. The final classifier must reject explicit negative sales evidence, inactive lifecycle features, non-retail shop values and inaccessible/private venues. Candidate counts are consequently an upper bound on publishable seller counts. Route, route-master and collection relations are excluded at extraction, regardless of product evidence.

Nodes, linear ways, closed areas/multipolygons and fixed `type=site` relations retain the existing geometry rules. Sites choose an actual member point closest to the member-centre, rather than an invented remote location. Incomplete toilet or seller geometries fail the source before a completion record; incomplete settlement boundaries remain counted skips. Original opening/access/payment/operator/brand/source-date tags remain available. Unknown opening hours and payments remain unknown; a machine is never presumed open 24/7.

Suggested availability wording: “Mapped tobacco sales; current cigarette stock and opening/access information are unverified.” Retain OSM attribution, source identity/link and snapshot date. Tobacco mapping does not guarantee a complete retailer directory.

## Retained-source reuse and filter invalidation

For the initial extension, explicitly pin `DATA_URL=https://download.geofabrik.de/europe/germany-261025.osm.pbf`. On the production source inspected on 2026-10-26, `/data/source.url` records that URL and `/data/source.md5` records `1a2bd3665c3e2507e1da99befd2ac228`. `prepare.sh` fetches the small published checksum and verifies the retained PBF before reuse; it downloads a new full source only if no retained file matches. Do not use the moving latest URL for this initial extension.

The filter includes all `vending`, `tobacco` and `sells:tobacco` tags plus `shop=tobacco`, preserving member dependencies through `osmium tags-filter`. These broad tag-key filters avoid losing whitespace/product-list variants; the Python and Node classifiers apply their documented semantics. The cache key contains the immutable source URL and the entire expression list. The new expressions invalidate the old WC-only filtered cache while preserving the verified full Germany file. Scheduled imports continue to resolve one Germany snapshot for every category.

## Germany baseline measurement

The retained 2026-10-25 Germany source was reused for the extension. The initial full-source diagnostic was stopped intentionally after filtering became available (exit 137, OOM false); the same read-only measurement ran against the complete expanded 52 MiB extract in 138.9 seconds. Saved results: VM `logs/tobacco-filtered-distribution.json` and `logs/tobacco-distribution-final.json`.

Candidates before final exclusions: **28,900 machines**, **2,113 shops**, **8 petrol stations**. Final published records: **28,898 machines**, **2,112 shops**, **8 petrol stations** = **31,018 sellers**. The difference reflects inactive/restricted sources. No generic petrol station is inferred to sell tobacco.

Observed explicit sales evidence includes `shop=tobacco` (1,424), `tobacco=yes` (475) and `sells:tobacco=yes` (304), plus many semicolon-delimited cigarette vending variants. The candidate object set contains 31,056 nodes and 153 ways with relevant tag evidence. Counts describe this extract, not a complete real-world seller inventory.

The production floor is set to **MIN_SELLERS=15000** from the measured ~31k baseline, with **MIN_IMPORT_RATIO=0.75** protecting subsequent refreshes from drops below 75% of the previous active category. The shared configurable default remains conservative for fresh deployments; explicit small sample imports use a floor of 1. Never lower production thresholds merely to bypass a suspicious refresh.

## Verification

Run `.venv/bin/python -m unittest discover -s importer`. Tests cover mixed-product tokens, explicit retail evidence, generic fuel/kiosk exclusion, misleading names, nodes/linear ways/areas/multipolygons/sites, multi-category identity, metadata/completion counts, absent seller geometry and existing WC/settlement extraction. Dated-source resolution is covered by `test_source.py`.

## Owner-approved petrol-station and machine-hours extension

After reviewing the sparse explicit petrol-station coverage, the owner approved including all active mapped `amenity=fuel` locations, while clearly labelling missing tobacco-sales evidence **Tobacco sales unconfirmed** in list/details. Explicit negative sales evidence and inactive/private restrictions still exclude a source. Generic non-fuel retailers continue to require positive sales evidence. Filter expressions now include `nwr/amenity=fuel`; this intentionally triggers reprocessing of the retained source. The earlier eight-station baseline above describes the previous evidence-only policy.

Machines lacking mapped opening hours default to `24/7` with `hoursAssumed=true` for Open now and visible translated assumption wording. Explicit source hours remain authoritative, and access restrictions remain visible/excluded as applicable. This default is applied to existing records at query time as well as future normalized imports; it does not rewrite raw source tags or require an hours-only reimport.

The owner subsequently chose to assume cigarette sales at mapped petrol stations and show no special sales label. Source evidence remains stored internally; explicit negative tags remain excluded. The expanded import published 48,514 sellers alongside 25,954 toilets and 196,951 settlements.

## Expanded retail policy (owner request)

Include `shop=lottery`, `kiosk`, `convenience` (including Spätis), `supermarket`, and `newsagent`, plus shops with `lottery=yes`. These join tobacco shops under the existing Shop filter. Cigarette sales are assumed for these categories with no special sales label; source evidence is retained internally, never fabricated as a mapped tobacco tag. Explicit negative tobacco tags and private/inactive restrictions still exclude them. Generic shop names alone do not qualify. Opening hours are never assumed for shops. The osmium prefilter and Python/TypeScript classifiers must remain aligned; the expanded filter triggers another retained-source extraction.
