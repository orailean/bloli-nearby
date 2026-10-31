# GitHub and Contabo Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Check pull requests and deploy verified main builds from private GHCR images to the existing ten-site Contabo installation, without enabling paid usage.

**Architecture:** GitHub Actions runs isolated checks, publishes three immutable image digests, and calls a restricted SSH deployment entry point. Host deployment and country refresh share a lock; a pending release is finalized only after public browser checks.

**Tech Stack:** GitHub Actions, GHCR, Docker Compose, POSIX/Bash scripts, Node test runner, PostGIS, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-30-github-contabo-deployment-design.md`

## Global Constraints

- Deploy only `main` from push/manual dispatch, after successful checks; PRs have no deployment secrets.
- Preserve the ten sites, four country datasets, external volumes, shared proxy, certificates and timers.
- Private GHCR packages, full commit tags and exact immutable digests; three matching API/web/importer revisions.
- No paid overage; verify account budget/stop-usage settings before activation.
- Keep database backups and tokens out of Git. No automatic DB restores, hard resets, global image pruning or country imports during deployment.

## Review Focus

- Stale runs and dirty checkouts must fail before production source/services change.
- A failed pull or backup must preserve the serving release and rollback references.
- Malformed SSH commands must never invoke a shell or arbitrary image repository.
- A lost finalize callback must retain pending state and rollback images.
- Deployment and country refresh must not overlap; refresh must use the released importer.

### Task 1: Deployment transaction and refresh coordination

**Files:** Create `scripts/deploy-production.sh`, `deploy/ssh/ghcr-entrypoint.sh`, `tests/deployment.test.ts`; modify `scripts/compose.sh`, `scripts/refresh-countries.sh`, `compose.production.yaml`, `.gitignore`.

**Interfaces:** `deploy-production.sh deploy SHA API_DIGEST WEB_DIGEST IMPORTER_DIGEST`; `deploy-production.sh finalize SHA success|failure`. Persist fixed image references in `.deploy/release.env` and release records under `.deploy/`; Compose reads the release file before resolving services. The stable SSH entry point validates `SSH_ORIGINAL_COMMAND` and fixed deployment path before invoking the checked-in transaction.

- [x] Write behavioral failure-path tests using temporary Git repositories and stubbed Docker/backup/health dependencies. Cover malformed inputs, stale/dirty source, busy lock, pull/revision-label/backup failure, no destructive rollback, pending/finalize identity and importer propagation.
- [x] Run `node --import tsx --test tests/deployment.test.ts` and observe expected failures before implementation.
- [x] Implement validation, shared locking, preflight, three image pulls, verified backup, source fast-forward, atomic release config, API/web recreation, public readiness and pending/final records. Pin previous image identities for manual rollback; retain only obsolete app-owned images after successful finalization.
- [x] Run the targeted suite, shell syntax checks, Compose rendering and `git diff --check`; commit verified transaction changes.

### Task 2: Main-only GHCR workflow

**Files:** Create `.github/workflows/deploy.yml`; extend deployment tests if needed; modify `scripts/check-multi-site-production.mjs` only for bounded network timeouts if required.

**Interfaces:** Checks gate image publication; build emits three digest outputs; deploy invokes Task 1 over strict-host-key SSH, then existing public browser checks and a success/failure finalize callback.

- [x] Add tests for deploy eligibility (push/manual main only), missing secrets, image output validation and workflow setup where meaningful; run and observe failure.
- [x] Implement pinned actions, read-only default permissions, isolated integration/browser databases, tests/build/browser checks, main-only publication using `GITHUB_TOKEN`, exact digest deployment, production concurrency and timeouts. Do not upload image archives or enable paid services.
- [x] Validate with actionlint; run unit/integration/browser checks and container builds where local tooling permits. Commit verified workflow.

### Task 3: Activation runbook and end-to-end verification

**Files:** Create `docs/deployment/github-actions.md`; update `docs/deployment/production-updates.md` and this plan's checkboxes.

**Interfaces:** Document environment secrets, VM read-only registry login, stable forced-command key installation, free-budget verification, first main run, abandoned pending recovery and previous-image rollback.

- [x] Write exact setup and recovery commands without real secrets; verify against implemented interfaces.
- [x] Run repository tests/build, strict OpenSpec validation and diff checks. Request one independent whole-change review and address material findings.
- [x] Check GitHub authentication and account free-budget/visibility settings. Configure and verify Contabo/GitHub only once access is available and zero-spend settings are verified; otherwise leave activation explicitly pending with precise missing inputs. Never ask for tokens in chat.
- [x] Observe a real main pipeline and public checks before claiming production completion; record run URL, commit, image digests and backup path. Commit docs and provide final verification/activation status.
