#!/bin/sh
set -eu
COUNTRY_CODE=${COUNTRY_CODE:-de}
DATA_ROOT=${DATA_ROOT:-/data}
case "$COUNTRY_CODE" in
  de) default_name=germany; DATA_DIR=$DATA_ROOT/countries/de ;;
  ro) default_name=romania; DATA_DIR=$DATA_ROOT/countries/ro ;;
  at) default_name=austria; DATA_DIR=$DATA_ROOT/countries/at ;;
  hu) default_name=hungary; DATA_DIR=$DATA_ROOT/countries/hu ;;
  *) echo 'UNSUPPORTED_COUNTRY' >&2; exit 1 ;;
esac
mkdir -p "$DATA_DIR"
DATA_URL=${DATA_URL:-https://download.geofabrik.de/europe/$default_name-latest.osm.pbf}
POLY_URL=${POLY_URL:-https://download.geofabrik.de/europe/$default_name.poly}
if [ "${USE_RETAINED_SOURCE:-0}" = 1 ]; then
  for file in source.url source.md5 source.osm.pbf coverage.poly; do
    [ -s "$DATA_DIR/$file" ] || { echo "MISSING_RETAINED_SOURCE: $file" >&2; exit 1; }
  done
  DATA_URL=$(cat "$DATA_DIR/source.url")
  # Compose's legacy defaults are Germany-specific; retained geometry belongs
  # to the selected country's cache, not to the default environment value.
  POLY_URL="https://download.geofabrik.de/europe/$default_name.poly"
else
  DATA_URL=$(python3 /app/importer/source.py "$DATA_URL")
fi
cleanup() {
  status=$?
  rm -f "$DATA_DIR/extracted.jsonl.part"
  if [ "$status" -eq 0 ]; then rm -f "$DATA_DIR/filtered.osm.pbf" "$DATA_DIR/filtered.source"; fi
}
trap cleanup EXIT
printf '[source] %s\n' "$DATA_URL"
# Fetch the small checksum first: latest Germany aliases do not expose .md5.
if [ "${USE_RETAINED_SOURCE:-0}" != 1 ]; then
  curl --silent --show-error --fail --location --retry 3 --output "$DATA_DIR/source.md5" "$DATA_URL.md5"
fi
expected=$(awk '{print $1}' "$DATA_DIR/source.md5")
printf '%s' "$expected" | grep -Eq '^[0-9a-fA-F]{32}$' || { echo 'INVALID_SOURCE_CHECKSUM' >&2; exit 1; }
reused=false
for candidate in "$DATA_DIR/source.osm.pbf" "$DATA_DIR/source.osm.pbf.part"; do
  if [ -f "$candidate" ] && [ "$(md5sum "$candidate" | awk '{print $1}')" = "$expected" ]; then
    if [ "$candidate" != "$DATA_DIR/source.osm.pbf" ]; then mv "$candidate" "$DATA_DIR/source.osm.pbf"; fi
    reused=true
    printf '[checksum] Reusing verified source: %s\n' "$candidate"
    break
  fi
done
if [ "$reused" = false ] && [ "${USE_RETAINED_SOURCE:-0}" = 1 ]; then
  echo 'RETAINED_SOURCE_CHECKSUM_MISMATCH' >&2; exit 1
fi
if [ "$reused" = false ]; then
  printf '[download] Fetching dated snapshot\n'
  curl --silent --show-error --fail --location --retry 3 --output "$DATA_DIR/source.osm.pbf.part" "$DATA_URL"
  actual=$(md5sum "$DATA_DIR/source.osm.pbf.part" | awk '{print $1}')
  [ "$expected" = "$actual" ] || { echo 'SOURCE_CHECKSUM_MISMATCH' >&2; exit 1; }
  mv "$DATA_DIR/source.osm.pbf.part" "$DATA_DIR/source.osm.pbf"
fi
printf '%s\n' "$DATA_URL" > "$DATA_DIR/source.url"
if [ "${USE_RETAINED_SOURCE:-0}" != 1 ]; then
  curl --silent --show-error --fail --location --retry 3 --output "$DATA_DIR/coverage.poly" "$POLY_URL"
fi
boundary_checksum=$(sha256sum "$DATA_DIR/coverage.poly" | awk '{print $1}')
context_key="$DATA_URL|$expected|transit-context-v2"
if [ ! -f "$DATA_DIR/transit-context.sqlite" ] || [ ! -f "$DATA_DIR/transit-context.source" ] || [ "$(cat "$DATA_DIR/transit-context.source")" != "$context_key" ]; then
  printf '[transit-context] Building bounded relation context\n'
  python3 /app/importer/transit_context.py "$DATA_DIR/source.osm.pbf" "$DATA_DIR/transit-context.sqlite" --fingerprint "$context_key"
  printf '%s\n' "$context_key" > "$DATA_DIR/transit-context.source"
else
  printf '[transit-context] Reusing source-bound relation context\n'
fi
FILTER_EXPRESSIONS='nwr/amenity=atm nwr/atm=yes nwr/tourism=hotel,motel,guest_house,hostel,apartment,chalet,camp_site,caravan_site nwr/amenity=charging_station nwr/amenity=toilets nwr/amenity=fuel nwr/toilets=yes nwr/place r/boundary=postal_code nwr/vending nwr/shop=tobacco,lottery,kiosk,convenience,supermarket,newsagent nwr/lottery=yes nwr/tobacco nwr/sells:tobacco nwr/cuisine nwr/amenity=drinking_water nwr/drinking_water nwr/drinking_water:refill nwr/fountain=drinking nwr/railway=station,halt,tram_stop,platform,subway_entrance,train_station_entrance nwr/highway=bus_stop,platform nwr/amenity=bus_station,taxi,ferry_terminal nwr/aerialway=station nwr/public_transport=station,platform,stop_position,entrance r/public_transport=stop_area'
filter_key="$DATA_URL|$FILTER_EXPRESSIONS"
if [ -f "$DATA_DIR/filtered.osm.pbf" ] && [ -f "$DATA_DIR/filtered.source" ] && [ "$(cat "$DATA_DIR/filtered.source")" = "$filter_key" ]; then
  printf '[filter] Reusing completed filtered snapshot\n'
else
  rm -f "$DATA_DIR/filtered.source"
  printf '[filter] Extracting all eight categories, places and postal boundaries\n'
  # This word list is a fixed set of filter arguments, not user input.
  osmium tags-filter "$DATA_DIR/source.osm.pbf" $FILTER_EXPRESSIONS -o "$DATA_DIR/filtered.osm.pbf" --overwrite
  printf '%s\n' "$filter_key" > "$DATA_DIR/filtered.source"
fi
printf '[geometry-preflight] Validating all eight categories and settlements\n'
python3 /app/importer/extract.py "$DATA_DIR/filtered.osm.pbf" "$DATA_DIR/coverage.poly" --source "$DATA_URL" --transport-context "$DATA_DIR/transit-context.sqlite" --context-fingerprint "$context_key" --boundary-source "$POLY_URL" --boundary-checksum "$boundary_checksum" --country-code "$COUNTRY_CODE" --source-checksum "$expected" --geometry-only
printf '[geometry] Building complete eight-category and settlement records\n'
python3 /app/importer/extract.py "$DATA_DIR/filtered.osm.pbf" "$DATA_DIR/coverage.poly" --source "$DATA_URL" --transport-context "$DATA_DIR/transit-context.sqlite" --context-fingerprint "$context_key" --boundary-source "$POLY_URL" --boundary-checksum "$boundary_checksum" --country-code "$COUNTRY_CODE" --source-checksum "$expected" > "$DATA_DIR/extracted.jsonl.part"
mv "$DATA_DIR/extracted.jsonl.part" "$DATA_DIR/extracted.jsonl"
printf '[publish] Source preparation complete\n'
