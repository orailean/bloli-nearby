## Why

People in Germany need to find nearby public toilets quickly and distinguish free facilities from paid ones. The owner needs a modern browser app that runs on their existing host without paid APIs or subscriptions.

## What Changes

- Introduce a responsive map and distance-ordered list of public toilets across Germany.
- Provide the complete interface in German, English, and Romanian, with language selection and a remembered preference.
- Support browser location, manual location selection, and All / Free / Paid filters with explicit unknown fee information.
- Show available access, opening hours, accessibility, and price information without inventing missing details.
- Load map tiles directly from OpenStreetMap's public tile servers; serve toilet data and searches from the owner's host, and offer external Google Maps walking directions without embedding Google's paid map API.
- Provide Docker Compose deployment, persistent storage, repeatable imports, and scheduled updates.

## Capabilities

### New Capabilities
- `nearby-toilet-discovery`: Location selection, nearby results, fee filtering, and facility details.
- `responsive-map-experience`: Accessible mobile and desktop map/list interaction and external directions.
- `germany-osm-data`: Germany-wide toilet ingestion, normalization, provenance, and safe refreshes.
- `self-hosted-operation`: Docker Compose, configurable public map tiles, persistent toilet data, and operational controls without paid services.

### Modified Capabilities
None; this is a new application.

## Impact

Adds a browser frontend, search API, spatial database, data import job, and direct browser loading of public OSM raster tiles. Uses existing host capacity (8 CPUs, 29 GiB total RAM, approximately 18 GiB available RAM and 541 GB available disk at planning time). Requires initial toilet/settlement data downloads, host storage and bandwidth, HTTPS, and OpenStreetMap attribution/license and public tile policy compliance. Public map availability depends on the external tile service; self-hosted maps remain a future option. No application code exists yet; framework choices in the design are proposed defaults.
