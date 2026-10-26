#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
umask 077
mkdir -p backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup="backups/bloli-nearby-$stamp.dump"
./scripts/compose.sh exec -T db sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup.part"
mv "$backup.part" "$backup"
printf '%s\n' "$backup"
