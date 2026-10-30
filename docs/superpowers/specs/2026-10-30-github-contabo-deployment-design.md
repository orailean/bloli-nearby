# GitHub Actions deployment to Contabo

## Intent and scope

Run repeatable checks for pull requests and deploy successful builds of `main` to the existing ten-site Contabo installation. The user selected main-only deployment after reviewing the proposed GitHub-hosted build and SSH deployment approach. Logging integration follows separately, after the pipeline is verified.

Production remains `/home/oliver/stack/bloli-nearby` as `oliver` on `173.212.194.159`. Keep the existing production Compose files, external data volumes, `nginx_default` network, shared proxy, certificates, weekly refresh and daily backup timers. This pipeline neither imports country datasets nor provisions infrastructure.

## Approaches

1. **Build on GitHub and transfer versioned images over SSH (selected design).** Build API, web and importer images on an amd64 GitHub-hosted runner, tag them with the full commit SHA, save them as one compressed Docker archive, and transfer them to the VM. This keeps build load off the production host and avoids a registry account or registry read token. Image transfer and retaining the current/previous release use some server disk space.
2. **Publish images to GHCR.** This adds a convenient registry and digest-based distribution, but requires registry access for the VM and package retention/visibility configuration. The initial pipeline does not need those dependencies. GHCR can replace archive transport later.
3. **Build on Contabo after pulling main.** This most closely matches the manual protocol, but repeats builds on the live host and makes the deployed image depend on a second build. Keep manual deployment documented as a fallback.

The transport choice, dedicated SSH key, locking, and failure policy below are implementation recommendations, not additional preferences attributed to the user.

## Workflow and trust boundary

Use GitHub-hosted Ubuntu runners; do not install a self-hosted runner on production. Run a check job for pull requests targeting `main`, pushes to `main`, and manual dispatch. Check out the event's exact commit, install the repository's supported Node 22 runtime and locked dependencies, then run unit tests, TypeScript/frontend build, and integration tests against an isolated PostGIS service. Run the existing Playwright suite against a separately seeded disposable database, so destructive integration fixtures cannot contaminate browser fixtures. No checks use production data or credentials.

The image build and deployment jobs require all checks to pass. They additionally require `github.ref == 'refs/heads/main'` and an event of `push` or `workflow_dispatch`; a pull request never deploys. A manual run on another branch may check code but must not build a release or access deployment secrets. Never use `pull_request_target` to execute proposed code with secrets.

Use read-only repository permissions by default, pin third-party actions to reviewed commit SHAs, avoid interpolating untrusted event text into shell commands, and use a `production` environment restricted to `main` where supported. No required human approval is added to routine deployments. Configure one non-cancelling production concurrency group; a newer push must not kill an in-flight deployment.

## Release artifact

Build `linux/amd64` images for the API, web gateway and importer, using the existing Dockerfiles and one full Git SHA tag. Save all three into a compressed archive and calculate SHA-256. Transfer the archive and digest as workflow artifacts between jobs, with short retention and no secrets included. Record the source SHA and checksum in the workflow summary.

Production Compose image names become configurable with defaults preserving today's manual builds. A small local release environment file supplies the same SHA tag for all three services. The importer used by future refresh jobs must resolve to the released image too; an API/web-only image switch is incomplete.

## Contabo deployment transaction

Use a dedicated Actions SSH key, strict host key verification using the independently verified server key, and no agent forwarding. The private key belongs only in GitHub's production secrets. Do not copy an existing personal SSH key into GitHub. Provision a restricted SSH entry point on the VM for this key: accept only `deploy <sha> <checksum>` and `finalize <sha> <checksum> <success|failure>`, validate the full SHA and SHA-256 checksum, disallow PTY/forwarding, receive the image stream in a private staging directory, and reject malformed commands. The stable entry point is installed outside the Git checkout; its installation and changes are explicit operations.

The host deployment script must:

1. Acquire a host deployment lock shared with the scheduled/manual country refresh wrapper. Use a bounded wait and fail clearly on contention. Also detect an already-running importer from before the shared lock was installed. Do not stop imports or timers automatically.
2. Require a clean tracked production checkout on `main`, fetch `origin/main`, and verify the requested SHA equals the fetched main tip. A stale workflow fails before changing services; it cannot downgrade a newer deployment. Reject untracked files that would be overwritten. Never use a hard reset or delete local changes.
3. Check free disk space before receiving/loading images, verify the streamed archive checksum, load images, and verify all three expected SHA-tagged images exist. Do this while the previous application is serving traffic.
4. Record previous source SHA, image references, and release configuration. Run the existing verified database backup script and record the resulting dump path. Backup failure prevents application changes. Keep the current single verified database dump retention policy.
5. Fast-forward the source checkout to the validated SHA and atomically write the release image configuration. Use the explicit production Compose file set and existing secrets; recreate only API and web with `--no-build` and wait for health. Never recreate the database or shared proxy.
6. Check each of the ten public hosts for the expected site identity and readiness across all four active countries. The Actions runner then runs the existing full production browser script, including real map tiles, category filters and mobile/localization checks. Give network requests and the overall job bounded timeouts.
7. Write a pending release record with source SHA, image identifiers, timestamp, backup path and host check outcomes. After browser checks, the runner sends the restricted `finalize` command with the same SHA/checksum and success or failure. Finalization acquires the host lock, verifies the pending release identity still matches, records the outcome atomically and never changes containers. Report success only after both host and runner checks pass and successful finalization is acknowledged. Keep current and previous release images; prune only known obsolete images belonging to this app after successful finalization. Do not run global Docker pruning.

A pending release prevents a second deployment. An always-run workflow cleanup attempts failure finalization if deployment succeeded but browser checks failed. If runner cancellation, timeout or lost connectivity prevents the callback, leave the record pending and retain all rollback images. Document an operator recovery command to inspect and mark an abandoned release failed under the host lock before rerunning; a timeout alone must not count as success or trigger image pruning. Refresh may run after the host deployment transaction releases its lock, using the new importer image; pending browser verification does not imply that serving containers or schema were rolled back.

Acquire the shared operation lock for the full refresh sequence as well as deployment. Existing per-import database locks remain in place; they serve a different purpose. A timed-out deployment can be rerun from `main` once the long import finishes.

## Failure and rollback

Before switching services, any failure leaves the serving release unchanged. After switching, a failed health or browser check makes the workflow fail and leaves the exact previous release references, logs and backup path available. Do not automatically restore a database or blindly run an older importer against a newer schema/category set.

Provide a documented manual application rollback using the previous image references and matching source SHA, with refresh coordination and readiness checks. Current startup schema setup is idempotent; future incompatible migrations require release-specific instructions and must not be assumed reversible. A release failure after schema setup may need operator intervention. Keep the existing explicit database restore command for cases that require it.

## Setup and verification

Repository files can be implemented and tested without GitHub API authentication. Activation requires installing the SSH entry point/key on Contabo and configuring production secrets (`CONTABO_SSH_PRIVATE_KEY`, verified `CONTABO_SSH_KNOWN_HOSTS`) and non-secret host/user/path variables. GitHub CLI is currently unauthenticated; authenticate locally or configure these in GitHub settings. Never request private key/token contents in chat.

Validate workflow syntax with actionlint, shell scripts with syntax checks and available linting, and targeted tests for main-only/event guards, malformed remote commands, dirty/stale checkout rejection, checksum/backup failure, release consistency, locking and retention. Exercise failure paths with stubbed Git/Docker/SSH commands rather than touching production. Then run repository checks and build images. Finally configure GitHub/Contabo and observe a real main deployment, checking all ten sites and recording the run URL and exact deployed SHA. Until that last step succeeds, describe the pipeline as implemented but not verified in production.

Official references: [GitHub workflow triggers](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow) and [deployment environments and concurrency](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments).
