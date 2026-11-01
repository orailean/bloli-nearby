#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# Optional Grafana Cloud log export. Independent of deployments and refreshes:
# stopping it never affects the sites, data, backups or schedules.
token=${GRAFANA_LOGS_TOKEN_FILE:-$PWD/.secrets/grafana_logs_token}
export GRAFANA_LOGS_TOKEN_FILE="$token"
collector() { docker compose -f deploy/log-collector/compose.yaml "$@"; }
case "${1:-}" in
  up)
    [ -s "$token" ] || { echo "MISSING_LOGS_TOKEN: $token" >&2; exit 1; }
    [ "$(ls -l "$token" | cut -c5-10)" = '------' ] || { echo "INSECURE_LOGS_TOKEN: chmod 600 $token" >&2; exit 1; }
    # Alloy sends the file verbatim; a pasted trailing newline invalidates the token.
    if LC_ALL=C grep -q '[[:space:]]' "$token" || [ "$(tail -c 1 "$token" | od -An -c | tr -d ' ')" = '\n' ]; then
      (umask 077; tr -d '[:space:]' < "$token" > "$token.part") && mv "$token.part" "$token"
    fi
    collector up -d --wait --wait-timeout 60 alloy
    ;;
  down)
    # Keeps the state volume, so a later start resumes from saved read positions.
    collector down
    ;;
  status)
    collector ps
    curl -fsS http://127.0.0.1:12345/metrics | grep -E '^(loki_write_(sent_entries|dropped_entries|sent_bytes)_total|loki_process_dropped_lines_total)' || true
    collector logs --since 1h alloy | tail -n 20
    ;;
  *)
    echo "Usage: $0 up|down|status" >&2
    exit 2
    ;;
esac
