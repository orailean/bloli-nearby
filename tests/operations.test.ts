import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
test("restore preserves the active production Compose files when recreating the gateway", () => {
  const temp = mkdtempSync(join(tmpdir(), "loo-ops-"));
  try {
    writeFileSync(join(temp, "backup.dump"), "fixture");
    writeFileSync(
      join(temp, "docker"),
      `#!/bin/sh
printf '%s|%s\\n' "$COMPOSE_FILE" "$*" >> "$LOO_TEST_LOG"
case "$*" in
 'compose ps -aq web') echo web-id ;;
 inspect*) echo '/project/compose.yaml,/project/compose.production.yaml' ;;
 *pg_restore*) cat >/dev/null ;;
esac
`,
      { mode: 0o755 },
    );
    const env = {
      ...process.env,
      PATH: `${temp}:${process.env.PATH}`,
      LOO_TEST_LOG: join(temp, "commands"),
      COMPOSE_FILE: "",
    };
    execFileSync(
      "/bin/sh",
      ["scripts/restore.sh", "--replace-database", join(temp, "backup.dump")],
      { env },
    );
    const calls = readFileSync(join(temp, "commands"), "utf8");
    assert.match(
      calls,
      /\/project\/compose.yaml:\/project\/compose.production.yaml\|compose up -d api web/,
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
