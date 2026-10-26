#!/bin/sh
set -eu
exec 9>/data/import.lock
flock -n 9 || { echo 'IMPORT_LOCKED' >&2; exit 1; }
cd /app
exec node --import tsx src/server/refresh-cli.ts
