# GitHub Actions and GHCR setup, 2026-10-30

## Implemented revisions

- `f4be79a`: archived six completed OpenSpec changes and synchronized 19 baseline capabilities. Logging remains the active local proposal.
- `fbb74b1`: restricted host deployment transaction, shared refresh lock and configurable production image references.
- `99c51ed`: main-only Actions checks, private GHCR image publication, SSH deployment/finalization and setup runbook.
- `03af75d`: corrected a pre-existing Romanian DST test expectation, explicitly set API/test runtimes to UTC, and fixed the installed helper's operator recovery root.

The user selected GHCR and requires no charges. The repository was verified public through GitHub's API; the workflow uses standard `ubuntu-24.04` runners. GHCR container storage and bandwidth are currently free. Private-repository runs require an explicit free-budget confirmation variable. No paid upgrade or overage was enabled.

## Contabo changes actually performed

Used the trusted `oliver@173.212.194.159` connection. Verified clean `main`, no active importer, flock/jq/node availability and approximately 518 GiB available before setup. Temporarily stopped the previously active refresh timer only while installing the first shared-lock wrapper; restored it through an exit trap. The daily backup timer was left running.

Before updating source, saved `.deploy/previous.json` with the **original** deployed source `75754fdccef7b13d0683215043c94d3c03d8c25d` and actual image IDs:

| Service | Previous immutable image ID |
| --- | --- |
| API | `sha256:4ec222b834bb03d5ae4d6054773bfba8c53634aa37dd0fc906cbd802b55a8d32` |
| Web | `sha256:3a93a6176ec1c3123bf3a44e7eccf4eea3b18aed2286605a284390cca3c98561` |
| Importer | `sha256:6e1a0afe021b8ee3814a88dc03d9a33ab92f041f6f15c32a9955b37dd60d2ff4` |

Fast-forwarded the checkout to the reviewed pipeline commits. Installed mode-0700 copies of `deploy-production.sh`, `operation-lock.sh` and `ghcr-entrypoint.sh` under `.deploy/bin/`. Created private `.deploy/docker/` for registry credentials; no registry token was supplied during setup. Added `.deploy/` to the local Git exclude file as well as its tracked ignore entry.

Generated a dedicated Ed25519 key locally under ignored `.secrets/github-actions/`. Installed only its public key with `restrict` and a forced command; retained every existing authorized key. Dedicated key fingerprint: `SHA256:ap05DyoVYKpEguNRCu25sZUt/SKQV6fdpVwTfFFlFpA`. A real SSH attempt using that key authenticated and returned `INVALID_DEPLOY_COMMAND` for an arbitrary shell command. The private key was not uploaded to Contabo or printed in logs.

Read the server's public host key through the trusted connection. Verified Ed25519 fingerprint `SHA256:/j2jSYwNxDksuGS5MmjeefoioSMUlzEJlJo3g8KF0TE`; prepared the ignored `known_hosts` file for GitHub. No unverified host-key acceptance was used.

After setup, refresh and backup timers were active; API/web retained their original healthy image IDs and `/api/ready` reported all four countries active and ready. No serving container, shared Nginx, database, volume, certificate or country snapshot was recreated by this setup. The deployment transaction will make a fresh verified database backup before its first actual image switch.

## Verification and findings

- Full unit suite: 111 passed after follow-up fixes.
- Isolated PostGIS integration suite: 17 passed.
- Browser suite against a separate synthetic four-country database: 54 passed.
- Python extractor suite: 54 passed.
- Production frontend/TypeScript build passed; existing bundle-size warning remains.
- All three `linux/amd64` Docker image builds passed; API rebuilt after explicit UTC configuration.
- actionlint 1.7.12 (official release checksum verified), shell syntax, production Compose rendering and whitespace checks passed.
- All 25 main OpenSpec capability specs passed strict validation.

Independent review identified and verified fixes for the tools-profile importer being omitted from Compose config, dependency recreation without `--no-deps`, and initial rollback source capture occurring too late. Retry regressions preserve the last good image/source baseline. Direct installed-helper recovery was additionally tested after correcting its root path.

The [first hosted check](https://github.com/orailean/bloli-nearby/actions/runs/41122265917) failed one pre-existing DST test: at `2026-03-29T00:30:00Z`, Bucharest is 02:30, not 03:30. Local Berlin Date normalization hid the incorrect assertion. The corrected test covers the real pre-jump opening interval and skipped hour; API/test scripts now start in UTC, matching production and preventing host-DST normalization. This was reproduced red/green locally and independently checked.

The [second hosted run](https://github.com/orailean/bloli-nearby/actions/runs/41123064291) at `03af75d` passed unit/build/integration/extractor checks, then exposed Node 22.22 attempting to watch the absent optional `.env.local` file during browser API startup. CI now uses `npm start` without a development watcher; all 54 browser tests passed locally with `CI=true`. A new hosted run verifies this clean-runner path. Publication and the first actual deployment remain pending.

The [third hosted run](https://github.com/orailean/bloli-nearby/actions/runs/41123958128) at `818e2f5` passed unit/build/integration/extractor checks and reached the browser suite. It exposed test-only screenshots hard-coded to macOS `/private/tmp`, which does not exist on GitHub's Linux runner. Screenshot paths now use Node's `tmpdir()` and `join()`. The complete 54-case browser suite passed locally against the disposable seeded CI database after this correction; the next hosted run must confirm the fix.

The [fourth hosted run](https://github.com/orailean/bloli-nearby/actions/runs/41150359924) at `ba2394c` passed the full hosted check job, including all 54 browser cases. `publish` and `deploy` were skipped because `CONTABO_DEPLOY_ENABLED` remains false, as intended. No images were published and production was not changed. The only source change since the run was triggered is this protocol update.

## Pending activation

The owner has configured the required `production` environment secrets through GitHub's UI: `CONTABO_SSH_PRIVATE_KEY`, `CONTABO_SSH_KNOWN_HOSTS`, and `GHCR_READ_TOKEN` (classic PAT with only `read:packages`). Restrict that environment to `main`. Hosted checks now pass. The repository variable `CONTABO_DEPLOY_ENABLED` remains false; setting it to `true` and manually dispatching **Check and deploy** from `main` will publish the three private GHCR images and deploy them to Contabo. The first production rollout has not yet run.

After activation, verify the three packages remain private, and record the workflow URL, source SHA, image digests and backup path here. Until then, this is **implemented and host-prepared, with hosted checks verified and image publication/deployment pending**. Follow the [runbook](github-actions.md) for token renewal, abandoned pending-release recovery and explicit compatible application rollback.
