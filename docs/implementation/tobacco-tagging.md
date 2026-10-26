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

A single read-only pyosmium scan of the retained full snapshot was launched on 2026-10-26. Diagnostics are saved under the production checkout's `logs/tobacco-distribution.{py,json,err}`. The scan counts tag distributions and candidate seller classes without loading geometry or changing application data. Counts and threshold recommendations will be recorded here after it completes; do not copy the WC minimum threshold onto tobacco sellers.

## Verification

Run `.venv/bin/python -m unittest discover -s importer`. Tests cover mixed-product tokens, explicit retail evidence, generic fuel/kiosk exclusion, misleading names, nodes/linear ways/areas/multipolygons/sites, multi-category identity, metadata/completion counts, absent seller geometry and existing WC/settlement extraction. Dated-source resolution is covered by `test_source.py`.
