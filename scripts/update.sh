#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# Refresh every active country in order, retaining each country's last good snapshot on failure.
exec ./scripts/refresh-countries.sh
