#!/bin/sh
set -eu
DATA_URL=${DATA_URL:-https://download.geofabrik.de/europe/germany-latest.osm.pbf}
POLY_URL=${POLY_URL:-https://download.geofabrik.de/europe/germany.poly}
DATA_URL=$(python3 /app/importer/source.py "$DATA_URL")
cleanup() { rm -f /data/filtered.osm.pbf /data/extracted.jsonl.part; }
trap cleanup EXIT
printf '[source] %s\n' "$DATA_URL"
# Fetch the small checksum first: latest Germany aliases do not expose .md5.
curl --silent --show-error --fail --location --retry 3 --output /data/source.md5 "$DATA_URL.md5"
expected=$(awk '{print $1}' /data/source.md5)
printf '%s' "$expected" | grep -Eq '^[0-9a-fA-F]{32}$' || { echo 'INVALID_SOURCE_CHECKSUM' >&2; exit 1; }
reused=false
for candidate in /data/source.osm.pbf /data/source.osm.pbf.part; do
  if [ -f "$candidate" ] && [ "$(md5sum "$candidate" | awk '{print $1}')" = "$expected" ]; then
    if [ "$candidate" != /data/source.osm.pbf ]; then mv "$candidate" /data/source.osm.pbf; fi
    reused=true
    printf '[checksum] Reusing verified source: %s\n' "$candidate"
    break
  fi
done
if [ "$reused" = false ]; then
  printf '[download] Fetching dated snapshot\n'
  curl --silent --show-error --fail --location --retry 3 --output /data/source.osm.pbf.part "$DATA_URL"
  actual=$(md5sum /data/source.osm.pbf.part | awk '{print $1}')
  [ "$expected" = "$actual" ] || { echo 'SOURCE_CHECKSUM_MISMATCH' >&2; exit 1; }
  mv /data/source.osm.pbf.part /data/source.osm.pbf
fi
printf '%s\n' "$DATA_URL" > /data/source.url
curl --silent --show-error --fail --location --retry 3 --output /data/coverage.poly "$POLY_URL"
printf '[filter] Extracting toilets, places and postal boundaries\n'
osmium tags-filter /data/source.osm.pbf nwr/amenity=toilets nwr/toilets=yes nwr/place r/boundary=postal_code -o /data/filtered.osm.pbf --overwrite
printf '[geometry] Building complete facility and settlement records\n'
python3 /app/importer/extract.py /data/filtered.osm.pbf /data/coverage.poly --source "$DATA_URL" > /data/extracted.jsonl.part
mv /data/extracted.jsonl.part /data/extracted.jsonl
printf '[publish] Source preparation complete\n'
