#!/bin/sh
# Source after changing to the app root; keep fd 9 open for the whole operation.
mkdir -p .deploy
exec 9>.deploy/operation.lock
if ! flock -w "${BLOLI_LOCK_WAIT_SECONDS:-600}" 9; then
  echo 'OPERATION_LOCKED: deployment or country refresh is running' >&2
  exit 1
fi
