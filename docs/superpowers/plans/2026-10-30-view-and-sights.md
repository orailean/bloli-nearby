# View and Sights Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement these tasks in order.

**Goal:** Add working View and Sights finders to the shared nearby platform.
**Architecture:** Dedicated categories and normalizers use the existing import registry, country snapshots and shared UI. A small tourist-place module shares fees and contact normalization; per-site modules retain their own identity.
**Tech Stack:** TypeScript, React, Leaflet, Node, PostgreSQL/PostGIS, Python/osmium.
**Spec:** `docs/superpowers/specs/2026-10-30-view-and-sights-design.md`

## Global constraints

- Preserve existing country data and require all already-active categories on refresh.
- Preserve unknown values and exclude restricted/inactive records; no invented availability.
- Support DE/EN/RO/HU; all eight analytics mappings remain isolated.
- Implement View before Sights; no production mutation during implementation.

## Review focus

- Observation towers must not include communication/watch towers without viewpoint evidence.
- Ruins remain discoverable while removed/demolished places do not.
- Type filters apply before limiting results and reject cross-category values/duplicates.
- Geometry failures abort output; category expansion must not break retained eight-category refreshes.
- New shells must not inherit another site's analytics or break 320px controls.

### Task 1: View data and discovery

- [x] Add failing classification/query tests in `tests/tourism.test.ts` and extraction tests in `importer/test_tourism.py`.
- [x] Add View types/normalizer, category registration, query validation and SQL filtering.
- [x] Extend extractor geometry support and source filters, schema/counts/country floor wiring.
- [x] Verify normalizer/query/extraction tests.

### Task 2: Sights data and discovery

- [x] Extend regression cases for historic precedence, ruins and restricted access.
- [x] Add Sights normalizer and registration using shared tourist-place details.
- [x] Verify both categories and legacy import compatibility.

### Task 3: Site UI and operational wiring

- [x] Add site modules, artwork, four locales, selectors, summaries and details.
- [x] Add native hostname, shell, favicon and gateway/proxy configuration.
- [x] Add guarded synthetic sample data and document development/rollout/floors.
- [x] Preserve existing analytics; verify new shells have none without assigned tokens.

### Task 4: Verification

- [x] Run unit and Python suites, build, disposable PostGIS integration and focused browser tests.
- [x] Review both sites on desktop and mobile and fix issues found.
- [x] Record checks, limitations and deployment steps for review.

## Execution rulings

- Work in the current clean checkout on `feat/view-and-sights`; the user has repeatedly requested implementation, so continue through routine choices without another approval handoff.
- Preserve complete legacy eight-category non-German snapshots until rollout; require active new categories through the existing omission guard.

## Verification record

- 93 unit checks, 52 Python extraction checks, 17 PostGIS integration checks and 40 multi-site browser cases passed. Production build passed, retaining the existing bundle-size advisory.
- A dedicated disposable PostGIS container on port 55439 held separate integration and synthetic sample databases. All four countries seeded successfully, and real HTTP Host requests returned two View and seven Sights results for each. Existing development and production databases were not used.
- Desktop and phone screenshots reviewed; the browser suite covers all four languages and widths 320, 390, 430 and 1440px. Tests intentionally block public map tiles.
- Independent read-only code review found no important issues.
- Ruling: corrected new fixture IDs after the seed's existing geometry safeguard rejected collisions; added a regression check for fixture identity/coordinate consistency.
- Ruling: incorporated the user's View analytics token during implementation. Sights remains unconfigured for analytics.
- Production DNS/TLS, measured category floors and live source publication remain deployment work; no production changes were made.
