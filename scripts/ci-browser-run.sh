#!/bin/sh
# Run browser checks with the matching official browsers and OS dependencies.
set -eu
[ "${GITHUB_ACTIONS:-}" = true ] || { echo 'GitHub Actions runner required' >&2; exit 1; }
[ -n "${GITHUB_WORKSPACE:-}" ] && [ -d "$GITHUB_WORKSPACE" ]
node --input-type=module -e 'import fs from "node:fs"; const p=JSON.parse(fs.readFileSync("package.json","utf8")); if(p.devDependencies["@playwright/test"]!=="1.64.1") throw new Error("Update the pinned Playwright image to match the project version");'
# v1.64.1-noble, pinned to its verified multi-platform manifest.
image=mcr.microsoft.com/playwright@sha256:2f05f8a734509a7b3f26a912639488ee08f58a7b292d14d62271bcff9038768f
exec docker run --rm --network host --ipc host --user "$(id -u):$(id -g)" \
  -e CI=true -e DATABASE_URL -e TEST_DATABASE_URL -e SITES -e EXPECTED_COUNTRIES \
  -v "$GITHUB_WORKSPACE:/work" -w /work "$image" "$@"
