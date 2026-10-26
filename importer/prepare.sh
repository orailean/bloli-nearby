#!/bin/sh
set -eu
DATA_URL=${DATA_URL:-https://download.geofabrik.de/europe/germany-latest.osm.pbf}
POLY_URL=${POLY_URL:-https://download.geofabrik.de/europe/germany.poly}
case "$DATA_URL" in https://download.geofabrik.de/*.osm.pbf) ;; *) echo 'Use a Geofabrik HTTPS PBF URL' >&2; exit 1;; esac
cleanup() { rm -f /data/filtered.osm.pbf /data/extracted.jsonl.part; }
trap cleanup EXIT
# Always restart a new snapshot download: resuming a mutable latest URL could mix versions.
curl --silent --show-error --fail --location --retry 3 --output /data/source.osm.pbf.part "$DATA_URL"
curl --silent --show-error --fail --location --retry 3 --output /data/source.md5 "$DATA_URL.md5"
expected=$(awk '{print $1}' /data/source.md5)
actual=$(md5sum /data/source.osm.pbf.part | awk '{print $1}')
[ "$expected" = "$actual" ] || { echo 'SOURCE_CHECKSUM_MISMATCH' >&2; exit 1; }
mv /data/source.osm.pbf.part /data/source.osm.pbf
curl --silent --show-error --fail --location --retry 3 --output /data/coverage.poly "$POLY_URL"
osmium tags-filter /data/source.osm.pbf nwr/amenity=toilets nwr/toilets=yes nwr/place r/boundary=postal_code -o /data/filtered.osm.pbf --overwrite
# Preserve original header timestamp explicitly when filtering has removed it.
python3 /app/importer/extract.py /data/filtered.osm.pbf /data/coverage.poly --source "$DATA_URL" > /data/extracted.jsonl.part
mv /data/extracted.jsonl.part /data/extracted.jsonl
