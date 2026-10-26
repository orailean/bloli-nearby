#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
[ "$#" -eq 2 ] && [ "$1" = '--replace-database' ] || { echo 'Usage: scripts/restore.sh --replace-database backups/FILE.dump (replaces current app database)' >&2; exit 1; }
[ -f "$2" ] || { echo 'Backup file not found' >&2; exit 1; }
# Stop application readers during replacement; do not touch the shared external Nginx.
./scripts/compose.sh stop api web
if ./scripts/compose.sh exec -T db sh -c 'exec pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --clean --if-exists --exit-on-error --single-transaction' < "$2"; then
  ./scripts/compose.sh up -d api web
else
  echo 'Restore failed. App readers remain stopped; inspect database before restarting.' >&2
  exit 1
fi
