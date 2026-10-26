#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# The importer holds filesystem and database locks for safe concurrent scheduling.
./scripts/compose.sh --profile tools run --rm importer
