#!/bin/bash
# Install a copy outside the checkout; bind only the dedicated Actions key to it.
set -euo pipefail
deploy_pattern='^deploy ([0-9a-f]{40}) (sha256:[0-9a-f]{64}) (sha256:[0-9a-f]{64}) (sha256:[0-9a-f]{64})$'
finalize_pattern='^finalize ([0-9a-f]{40}) (success|failure)$'
original=${SSH_ORIGINAL_COMMAND:-}
if [[ $original == registry-login ]]; then
  args=(registry-login)
elif [[ $original =~ $deploy_pattern ]]; then
  args=(deploy "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}" "${BASH_REMATCH[3]}" "${BASH_REMATCH[4]}")
elif [[ $original =~ $finalize_pattern ]]; then
  args=(finalize "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}")
else
  echo INVALID_DEPLOY_COMMAND >&2
  exit 2
fi
export BLOLI_DEPLOY_ROOT=/home/oliver/stack/bloli-nearby
exec "$BLOLI_DEPLOY_ROOT/.deploy/bin/deploy-production.sh" "${args[@]}"
