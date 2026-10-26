#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
# Preserve a running/stopped deployment's file set when an operation recreates services.
# An explicit COMPOSE_FILE always wins; Compose also reads it from .env.
if [ -z "${COMPOSE_FILE:-}" ]; then
  container=$(docker compose ps -aq web 2>/dev/null || true)
  if [ -n "$container" ]; then
    files=$(docker inspect --format '{{ index .Config.Labels "com.docker.compose.project.config_files" }}' "$container")
    if [ -n "$files" ] && [ "$files" != '<no value>' ]; then
      COMPOSE_FILE=$(printf '%s' "$files" | tr ',' ':')
      export COMPOSE_FILE
    fi
  fi
fi
exec docker compose "$@"
