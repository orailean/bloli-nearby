# Production branch consolidation, 2026-10-29

Merged `feat/multi-country-coverage` into `main` as `a1b4485` and pushed `main`. All 78 unit tests passed on the merged result. The merge contains the same application tree as the already deployed feature revision `bf82d2c`, so no service recreation or database migration was required.

Switched `/home/oliver/stack/bloli-nearby` on Contabo to `main` and fast-forwarded it to `origin/main`. API, web and PostGIS remained healthy. Future production source updates use `main`.

Verified the live Charge detail link contains `travelmode=driving`; its mobile/localization/map checks also passed. Charge already had the requested driving default, so no route behavior change was needed.

Deleted fully merged `feat/charge-site` and `feat/multi-country-coverage` branches locally and on GitHub. Deleted the old local multi-country branch on the VM and pruned its remote references. The managed detached local worktree was preserved.
