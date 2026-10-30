#!/bin/bash
set -euo pipefail
umask 077

die() { echo "$*" >&2; exit 1; }
valid_sha() { [[ $1 =~ ^[0-9a-f]{40}$ ]]; }
valid_digest() { [[ $1 =~ ^sha256:[0-9a-f]{64}$ ]]; }
command=${1:-}
sha=${2:-}
case "$command" in
  registry-login) [[ $# == 1 ]] || die INVALID_DEPLOY_COMMAND ;;
  deploy)
    valid_sha "$sha" || die INVALID_DEPLOY_COMMAND
    [[ $# == 5 ]] || die INVALID_DEPLOY_COMMAND
    for value in "$3" "$4" "$5"; do valid_digest "$value" || die INVALID_DEPLOY_COMMAND; done ;;
  finalize)
    valid_sha "$sha" || die INVALID_DEPLOY_COMMAND
    [[ $# == 3 && ($3 == success || $3 == failure) ]] || die INVALID_DEPLOY_COMMAND ;;
  *) die INVALID_DEPLOY_COMMAND ;;
esac

script_dir=$(cd "$(dirname "$0")" && pwd)
app_root=${BLOLI_DEPLOY_ROOT:-}
if [[ -z $app_root ]]; then
  case "$script_dir" in
    */.deploy/bin) app_root="$script_dir/../.." ;;
    *) app_root="$script_dir/.." ;;
  esac
fi
cd "$app_root"
export COMPOSE_FILE=compose.yaml:compose.production.yaml
. "$script_dir/operation-lock.sh"
export DOCKER_CONFIG="$PWD/.deploy/docker"
if [[ $command == registry-login ]]; then
  mkdir -p "$DOCKER_CONFIG"
  docker login ghcr.io -u orailean --password-stdin
  chmod 600 "$DOCKER_CONFIG/config.json"
  exit 0
fi

atomic_json() { jq . > "$1.part"; mv "$1.part" "$1"; }
source_url=https://github.com/orailean/bloli-nearby
repositories=(ghcr.io/orailean/bloli-nearby-api ghcr.io/orailean/bloli-nearby-web ghcr.io/orailean/bloli-nearby-importer)

if [[ $command == finalize ]]; then
  [[ -f .deploy/pending.json ]] || die NO_PENDING_RELEASE
  [[ $(jq -r .source .deploy/pending.json) == "$sha" ]] || die RELEASE_MISMATCH
  if [[ $3 == success ]]; then
    [[ $(jq -r .hostVerified .deploy/pending.json) == true ]] || die HOST_NOT_VERIFIED
    [[ $(git rev-parse HEAD) == "$sha" ]] || die RELEASE_MISMATCH
  fi
  mkdir -p ".deploy/releases/$sha"
  jq --arg status "$3" --arg at "$(date -u +%FT%TZ)" '. + {status:$status, finalizedAt:$at}' .deploy/pending.json |
    atomic_json ".deploy/releases/$sha/release.json"
  if [[ $3 == success ]]; then
    cp ".deploy/releases/$sha/release.json" .deploy/current.json.part
    mv .deploy/current.json.part .deploy/current.json
  fi
  rm .deploy/pending.json
  # Only app-owned image IDs, never force removal, and only after verification.
  # Keep both the new release and the exact images used before this deployment.
  if [[ $3 == success ]]; then
    keep=$(jq -r '.imageIds[], .previous.imageIds[]' .deploy/current.json)
    for repository in "${repositories[@]}" bloli-nearby-api bloli-nearby-web bloli-nearby-importer; do
      while IFS= read -r image; do
        [[ -n $image ]] || continue
        if ! printf '%s\n' "$keep" | grep -Fxq "$image"; then
          docker image rm "$image" || echo "IMAGE_RETAINED: $image (referenced or in use)" >&2
        fi
      done < <(docker image ls "$repository" --no-trunc --format '{{.ID}}')
    done
  fi
  echo "RELEASE_FINALIZED: $sha $3"
  exit 0
fi

[[ ! -f .deploy/pending.json ]] || die 'PENDING_RELEASE: inspect and finalize the previous attempt first'
[[ $(git branch --show-current) == main ]] || die NOT_ON_MAIN
[[ -z $(git status --porcelain --untracked-files=normal) ]] || die DIRTY_CHECKOUT
git fetch origin main
[[ $(git rev-parse refs/remotes/origin/main) == "$sha" ]] || die STALE_MAIN
git merge-base --is-ancestor HEAD "$sha" || die NON_FAST_FORWARD
[[ -z $(docker ps -q --filter label=com.docker.compose.project=bloli-nearby --filter label=com.docker.compose.service=importer) ]] || die IMPORT_RUNNING
available=$(df -Pk . | awk 'END {print $4}')
[[ $available -ge 5242880 ]] || die 'LOW_DISK: need at least 5 GiB before pulling release images'

refs=("${repositories[0]}@$3" "${repositories[1]}@$4" "${repositories[2]}@$5")
image_ids=()
for image in "${refs[@]}"; do
  docker pull "$image" || die IMAGE_PULL_FAILED
  [[ $(docker image inspect "$image" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}') == "$sha" ]] || die IMAGE_REVISION_MISMATCH
  [[ $(docker image inspect "$image" --format '{{index .Config.Labels "org.opencontainers.image.source"}}') == "$source_url" ]] || die IMAGE_SOURCE_MISMATCH
  image_ids+=("$(docker image inspect "$image" --format '{{.Id}}')")
done

previous_sha=$(git rev-parse HEAD)
if [[ -f .deploy/current.json ]]; then
  if [[ $(jq -r .source .deploy/current.json) == "$sha" ]]; then
    # Re-running the same successful revision must not erase its rollback release.
    jq '.previous' .deploy/current.json | atomic_json .deploy/previous.json
  else
    jq '{source:.source,imageIds:.imageIds}' .deploy/current.json | atomic_json .deploy/previous.json
  fi
elif [[ ! -f .deploy/previous.json ]]; then
  config=$(./scripts/compose.sh --profile tools config --format json)
  old_ids=()
  for service in api web importer; do
    old_ref=$(printf '%s' "$config" | jq -er ".services.$service.image")
    old_ids+=("$(docker image inspect "$old_ref" --format '{{.Id}}')")
  done
  # Snapshot IDs rather than mutable tags. Before the first successful pipeline
  # deployment, retries keep this original, manually deployed baseline.
  jq -n --arg source "$previous_sha" --arg api "${old_ids[0]}" --arg web "${old_ids[1]}" --arg importer "${old_ids[2]}" \
    '{source:$source,imageIds:[$api,$web,$importer]}' | atomic_json .deploy/previous.json
fi
backup=$(./scripts/backup.sh) || die BACKUP_FAILED
[[ -f $backup ]] || die BACKUP_MISSING

# Persist recovery state before the first source/config/container mutation.
jq -n --arg source "$sha" --arg at "$(date -u +%FT%TZ)" --arg backup "$backup" \
  --arg api "${refs[0]}" --arg web "${refs[1]}" --arg importer "${refs[2]}" \
  --arg apiId "${image_ids[0]}" --arg webId "${image_ids[1]}" --arg importerId "${image_ids[2]}" \
  --slurpfile previous .deploy/previous.json \
  '{source:$source,startedAt:$at,backup:$backup,images:[$api,$web,$importer],imageIds:[$apiId,$webId,$importerId],previous:$previous[0],hostVerified:false,status:"pending"}' |
  atomic_json .deploy/pending.json
umask 022
git merge --ff-only "$sha"
umask 077
printf 'BLOLI_API_IMAGE=%s\nBLOLI_WEB_IMAGE=%s\nBLOLI_IMPORTER_IMAGE=%s\n' "${refs[@]}" > .deploy/release.env.part
mv .deploy/release.env.part .deploy/release.env
./scripts/compose.sh up -d --no-build --no-deps --wait --wait-timeout 180 api web
for site in loo kippe kebab water transit charge atm stay view sights; do
  base="https://$site.bloli.com"
  curl --fail --silent --show-error --connect-timeout 10 --max-time 30 "$base/api/site" | jq -e --arg id "$site" '.id == $id' >/dev/null
  curl --fail --silent --show-error --connect-timeout 10 --max-time 30 "$base/api/ready" |
    jq -e '.ready == true and ([.countries[] | select(.status == "active" and .ready == true) | .code] | sort == ["at","de","hu","ro"])' >/dev/null
done
jq '.hostVerified = true' .deploy/pending.json | atomic_json .deploy/pending.json
echo "RELEASE_PENDING_BROWSER_CHECKS: $sha backup=$backup"
