#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ -f .deploy/docker/config.json ]; then
  export DOCKER_CONFIG="$PWD/.deploy/docker"
fi
# The deployment writes only these validated, non-secret immutable references.
if [ -f .deploy/release.env ]; then
  while IFS='=' read -r key value; do
    case "$key" in
      BLOLI_API_IMAGE) image=api ;;
      BLOLI_WEB_IMAGE) image=web ;;
      BLOLI_IMPORTER_IMAGE) image=importer ;;
      *) echo INVALID_RELEASE_CONFIG >&2; exit 1 ;;
    esac
    if ! printf '%s\n' "$value" | LC_ALL=C grep -Eq "^ghcr\.io/orailean/bloli-nearby-$image@sha256:[0-9a-f]{64}$"; then
      echo INVALID_RELEASE_CONFIG >&2
      exit 1
    fi
    export "$key=$value"
  done < .deploy/release.env
fi
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
