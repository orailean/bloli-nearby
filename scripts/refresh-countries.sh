#!/bin/sh
set -eu
cd "$(dirname "$0")/.."

target=${1:-}
if [ "$#" -gt 1 ]; then
  echo "Usage: $0 [de|ro|at|hu]" >&2
  exit 2
fi

run_country() {
  code=$1
  case "$code" in
    de) name=germany ;;
    ro) name=romania ;;
    at) name=austria ;;
    hu) name=hungary ;;
    *) echo "UNSUPPORTED_COUNTRY: $code" >&2; return 2 ;;
  esac
  echo "[refresh] country=$code source=$name"
  ./scripts/compose.sh --profile tools run --rm \
    -e "COUNTRY_CODE=$code" \
    -e "DATA_URL=https://download.geofabrik.de/europe/$name-latest.osm.pbf" \
    -e "POLY_URL=https://download.geofabrik.de/europe/$name.poly" \
    importer
}

if [ -n "$target" ]; then
  run_country "$target"
  exit $?
fi

countries=$(./scripts/compose.sh exec -T db sh -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT code FROM countries WHERE status = '\''active'\'' ORDER BY rollout_order"')
if [ -z "$countries" ]; then
  echo "NO_ACTIVE_COUNTRIES" >&2
  exit 1
fi

failed=0
for code in $countries; do
  if run_country "$code"; then
    echo "[refresh] country=$code result=success"
  else
    result=$?
    echo "[refresh] country=$code result=failed exit=$result" >&2
    failed=1
  fi
done
exit "$failed"
