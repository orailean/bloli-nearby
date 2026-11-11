# Italy and Italian

Italy is an independently importable country (`it`, Europe/Rome) using the Geofabrik Italy PBF and boundary. It starts pending; all twelve site snapshots and source/boundary checksums are required before activation. `scripts/refresh-countries.sh it` targets Italy alone. The weekly job includes Italy only after activation.

Measure the source before setting `MIN_IT_*` floors. Publication and activation do not require reimporting existing countries. Existing parking datasets remain a separate rollout. Preserve original country membership identities and provenance before/after Italy publication.

All twelve sites support Italian, including automatic `it-IT` selection, translated place names, date/distance formatting and country labels. Shared introductions, footers and default search labels are country-neutral in every language. The coverage badge lists actual active countries.

Initial validation: 138 unit tests, 64 Python tests, production build and 48 responsive browser cases passed before the final country-neutral copy change. Final focused language/copy checks passed; CI verifies the real PostGIS import and all browser tests before deployment. Production country gates remain scoped to the four active countries until Italy publication/activation is verified.

Italy source measured on 2026-11-11: 2,251,131,214 bytes. Contabo free disk: about 514 GiB; estimated additional working space 10–20 GB. No Italy import has been started yet.
