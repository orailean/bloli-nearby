# View and Sights

Build View first, then Sights, on the shared React/Leaflet, Node/PostGIS and OSM importer stack. Keep all four country snapshots, locales, existing category isolation and publication safeguards.

View includes `tourism=viewpoint`, or `man_made=tower` with `tower:type=observation`. Sights includes `tourism=museum|attraction` and `historic=castle|ruins|monument|memorial|archaeological_site`. Explicit class evidence is required; a name alone never qualifies. More specific historic classifications take precedence over generic attractions. Viewpoint towers have one View record per source. A source may legitimately belong to both categories.

Both sites support type, fee and mapped Open now filters, walking directions, translated names, access/wheelchair details, mapped phone/website and source links. Unknown fees/hours stay unknown. Private, locked, conditional-access and inactive features are excluded. Historical ruins (`historic=ruins` or `ruins=yes`) are valid destinations, but explicit demolished/removed/proposed features are not. View shows mapped elevation/direction/height as source text and explains straight-line distance and terrain uncertainty. Neither site supplies trail navigation, ticket booking or current operating/access guarantees.

Use separate modules and normalization functions with a common tourist-place base. Alternative: one combined tourist site would reduce branding work but weaken the two focused user tasks. Reusing Stay would mix accommodation semantics and filters, so extend the existing category registry instead.

View uses blue-grey mountains, glacier blue, forest green and a saffron sun; Sights uses a light blue city backdrop, indigo landmarks and coral details. Both retain existing typefaces, accessible filters, map/list layout and mobile behavior. Add native hostnames, static shells/favicon metadata and production proxy templates. View uses the subsequently supplied token `66e9fa7dd6aa48dea133dfb9a1611a12`; Sights has no assigned token yet. Preserve all eight existing mappings.

Existing eight-category country snapshots remain importable until the new categories are activated. Once active, existing omission checks require them on every refresh. New extractor output contains all ten categories. New publication floors must be explicitly measured/configured by country before production rollout. No production deployment or source refresh is part of this implementation request.
