# GitHub Actions and private GHCR deployments

The workflow is `.github/workflows/deploy.yml`. Pull requests to `main` run checks. Pushes/manual runs on `main` publish and deploy only after checks pass and the repository variable `CONTABO_DEPLOY_ENABLED` equals `true`. Other branches never publish or deploy. Deployment is disabled by default.

Checks run unit tests, the production frontend build, integration tests against disposable PostGIS, Python extractor tests, and Playwright against a separately seeded browser database. The three amd64 images use the source commit tag and OCI revision/source labels. Contabo pulls their exact digests, backs up the database, fast-forwards clean source, recreates only API/web, and checks all ten sites. The importer digest is persisted for scheduled refreshes. The runner's public browser checks must pass before successful finalization and app-only image cleanup.

## Free usage and package visibility

`orailean/bloli-nearby` was verified public on 2026-10-30. Standard GitHub-hosted Linux runners for public repositories are free; this workflow uses `ubuntu-24.04`, no larger runners, paid build service or image-archive artifacts. GHCR container storage/bandwidth is currently free, including private images. These policies may change: [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions), [GHCR billing](https://docs.github.com/en/billing/concepts/product-billing/github-packages).

Keep the three packages private. Workflow publication uses the built-in `GITHUB_TOKEN` with `packages: write` only in the publish job. The source label links each package to this repository. Verify the packages inherit repository Actions access after the first publication. Do not change package visibility to work around authentication.

If the repository becomes private, all checks/publication are gated until the repository variable `FREE_CI_CONFIRMED=true` is set. Before setting it, verify the account's Actions allowance and a budget/usage policy that stops paid usage at the limit in GitHub Billing. Leave this variable unset otherwise. No upgrade or paid overage is authorized by this setup.

## GitHub UI setup

Open [production environment settings](https://github.com/orailean/bloli-nearby/settings/environments), create `production`, and select only the `main` branch for deployments. No routine manual approval is needed. Add these **environment secrets**:

| Secret | Contents |
| --- | --- |
| `CONTABO_SSH_PRIVATE_KEY` | Entire dedicated Ed25519 private key, including BEGIN/END lines. Initial local file: `.secrets/github-actions/contabo_deploy`. |
| `CONTABO_SSH_KNOWN_HOSTS` | Verified `173.212.194.159 ssh-ed25519 ...` entry. Initial local file: `.secrets/github-actions/known_hosts`. |
| `GHCR_READ_TOKEN` | A classic GitHub PAT owned by `orailean`, scoped only to `read:packages`, with access to these packages. |

Create the token under [Tokens (classic)](https://github.com/settings/tokens). Choose only `read:packages`; no `repo`, write, or delete scope is needed for this server. Use an expiration date and renew the environment secret before expiry. Do not put secrets into issues, workflow inputs, source files, command arguments or chat.

The runner passes the read token over encrypted SSH stdin to a fixed `registry-login` command. Docker stores it with mode 0600 under `/home/oliver/stack/bloli-nearby/.deploy/docker/config.json`, separately from this user's other Docker credentials. Both deployment and the Compose wrapper use that Docker config. It is excluded from Git and Docker build contexts. Renewing the GitHub secret updates the VM login at the next deployment.

After host setup and verification, add the **repository Actions variable** `CONTABO_DEPLOY_ENABLED=true` at [Actions variables](https://github.com/orailean/bloli-nearby/settings/variables/actions). Do not place this variable only in the production environment: publication happens before the environment job. Leave it unset during setup.

## One-time Contabo setup

Use the existing trusted personal SSH connection for installation. The dedicated Actions key cannot run installation or arbitrary shell commands. After the reviewed pipeline commit is on `main`, verify no import is running. **Capture the original deployed source and image IDs before fast-forwarding the checkout.** This updates operation wrappers without recreating serving containers:

```sh
cd /home/oliver/stack/bloli-nearby
git status --short
docker ps --filter label=com.docker.compose.project=bloli-nearby --filter label=com.docker.compose.service=importer
umask 077
mkdir -p .deploy/bin .deploy/docker
chmod 700 .deploy .deploy/bin .deploy/docker
# Needed while the old revision does not yet ignore .deploy/.
printf '\n.deploy/\n' >> .git/info/exclude
exec 9>.deploy/operation.lock
flock -w 600 9
# Refuse installation if an import is active; do not replace its operation wrapper.
test -z "$(docker ps -q --filter label=com.docker.compose.project=bloli-nearby --filter label=com.docker.compose.service=importer)"
if [ ! -f .deploy/previous.json ] && [ ! -f .deploy/current.json ]; then
  source=$(git rev-parse HEAD)
  api=$(docker inspect --format '{{.Image}}' bloli-nearby-api)
  web=$(docker inspect --format '{{.Image}}' bloli-nearby-web)
  importer_ref=$(scripts/compose.sh --profile tools config --format json | jq -er .services.importer.image)
  importer=$(docker image inspect --format '{{.Id}}' "$importer_ref")
  jq -n --arg source "$source" --arg api "$api" --arg web "$web" --arg importer "$importer" \
    '{source:$source,imageIds:[$api,$web,$importer]}' > .deploy/previous.json.part
  mv .deploy/previous.json.part .deploy/previous.json
fi
umask 022
git pull --ff-only origin main
umask 077
install -m 0700 scripts/deploy-production.sh scripts/operation-lock.sh deploy/ssh/ghcr-entrypoint.sh .deploy/bin/
flock -u 9
```

Install only the dedicated public key in `~/.ssh/authorized_keys`, preserving all existing lines. Prefix its line with:

```text
restrict,command="/home/oliver/stack/bloli-nearby/.deploy/bin/ghcr-entrypoint.sh" ssh-ed25519 PUBLIC_KEY bloli-nearby-github-actions
```

This key accepts only `registry-login`, `deploy SHA API_DIGEST WEB_DIGEST IMPORTER_DIGEST`, and `finalize SHA success|failure`. It cannot open a shell, allocate a PTY, forward ports or fetch arbitrary image names. The entry point and transaction copies are stable outside Git; updating those files requires the trusted operator installation step again. A workflow edit alone cannot replace these host-side guards. Keep the local private key mode 0600 and the key directory mode 0700.

Verify the known-host entry over the existing trusted connection, not by accepting an unverified `ssh-keyscan` result. Initially verified Ed25519 fingerprint: `SHA256:/j2jSYwNxDksuGS5MmjeefoioSMUlzEJlJo3g8KF0TE`. Test that `ssh` using the dedicated key rejects an arbitrary command before enabling deployment. Do not copy the personal SSH private key to GitHub.

## First run and release records

Once secrets and the enable variable are set, manually run **Check and deploy** from the `main` branch in [Actions](https://github.com/orailean/bloli-nearby/actions/workflows/deploy.yml). Record the run URL, deployed source SHA, three image digests, and backup path. A passing check-only run is not a successful deployment. Verify all three packages remain private and the workflow can push new versions.

The host uses `.deploy/operation.lock` for both deployment and the entire country refresh sequence. Deployment waits up to ten minutes, then fails if a long import still holds it; rerun after import completes. The legacy importer-container preflight also refuses a running importer. Existing daily backups retain their separate backup lock and latest verified dump policy.

Host recovery metadata is private under `.deploy/`:

- `release.env`: the three active digest references consumed by `scripts/compose.sh`.
- `pending.json`: an attempt awaiting host or browser verification; it blocks another deployment.
- `previous.json`: immutable image IDs and source SHA of the rollback baseline.
- `current.json`: last successfully verified pipeline release.
- `releases/SHA/release.json`: finalized success/failure, backup path and image references.

A failure before the source/image switch leaves the serving release unchanged. A failure after that point does not silently roll back code or database. The workflow attempts failure finalization; failed/pending releases retain their rollback images. A retry, including one of the same SHA, preserves the last good baseline.

If a runner disappears before finalization, inspect `.deploy/pending.json`, app health and the workflow run using the trusted operator connection. Mark an abandoned attempt failed only after confirming the workflow is no longer deploying:

```sh
cd /home/oliver/stack/bloli-nearby
sha=$(jq -r .source .deploy/pending.json)
.deploy/bin/deploy-production.sh finalize "$sha" failure
```

This clears the pending marker and records failure; it neither changes containers nor deletes rollback images. Never finalize success merely because a timeout elapsed.

## Manual application rollback

Pause refresh before an incompatible rollback and use a trusted operator session. Confirm no import is running. Do not restore the database automatically or run an older importer against a newer category/schema set. The pre-deployment backup path is in the release record; if a database restore is required, follow `scripts/restore.sh --replace-database EXACT_DUMP` and the release-specific migration instructions.

For a compatible application-only rollback, retain the operation lock while switching source and recreating API/web. Use a final Compose override with the recorded immutable local image IDs, including importer, so this works even for the first pre-pipeline baseline:

```sh
cd /home/oliver/stack/bloli-nearby
sudo systemctl stop bloli-nearby-refresh.timer
exec 9>.deploy/operation.lock
flock -w 600 9
previous=$(jq -r .source .deploy/previous.json)
jq -r '"services:\n  api:\n    image: " + .imageIds[0] + "\n  web:\n    image: " + .imageIds[1] + "\n  importer:\n    image: " + .imageIds[2]' .deploy/previous.json > .deploy/rollback.yaml
git switch --detach "$previous"
COMPOSE_FILE=compose.yaml:compose.production.yaml:.deploy/rollback.yaml scripts/compose.sh up -d --no-build --no-deps --wait --wait-timeout 180 api web
curl --fail --max-time 30 https://loo.bloli.com/api/ready
# Check all ten sites and category/country readiness before considering rollback verified.
flock -u 9
```

Keep refresh paused until importer compatibility is confirmed. Returning to pipeline deployment requires switching the clean checkout back to `main`, inspecting pending/current/previous records, and retaining the actual rollback image baseline. Reconcile `current.json` with the verified manually restored release before deploying again; do not label an unverified rollback successful. Remove the rollback Compose override only after a normal verified deployment is serving again. Never use `down -v`, delete volumes, or globally prune Docker as recovery.

## Current activation status

The first production rollout succeeded in [run 41153636376](https://github.com/orailean/bloli-nearby/actions/runs/41153636376), including all ten public site checks and finalization. `CONTABO_DEPLOY_ENABLED=true` is enabled as a repository Actions variable. The [setup protocol](protocol-2026-10-30-github-actions.md) records image digests, the verified backup and verification that all three packages are private: anonymous manifest requests return 403 and authenticated Contabo pulls succeed. GitHub CLI authentication is not required when the owner supplies configuration through the UI.
