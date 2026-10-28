import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function harness() {
  const root = mkdtempSync(join(tmpdir(), "bloli-refresh-countries-"));
  const scripts = join(root, "scripts");
  const bin = join(scripts, "compose.sh");
  const source = readFileSync("scripts/refresh-countries.sh", "utf8");
  mkdirSync(scripts, { recursive: true });
  writeFileSync(join(scripts, "refresh-countries.sh"), source, { mode: 0o755 });
  writeFileSync(
    bin,
    `#!/bin/sh
printf '%s\\n' "$*" >> "$TEST_LOG"
case " $* " in
  *" exec "*) printf '%s\\n' "$TEST_COUNTRIES" ;;
  *" run "*) case "$*" in *"COUNTRY_CODE=ro"*) exit 23;; esac ;;
esac
`,
    { mode: 0o755 },
  );
  return { root, log: join(root, "calls"), script: join(scripts, "refresh-countries.sh") };
}

test("scheduled country refresh runs sequentially, continues after failure, and reports nonzero", () => {
  const h = harness();
  try {
    const result = spawnSync("/bin/sh", [h.script], {
      encoding: "utf8",
      env: { ...process.env, TEST_LOG: h.log, TEST_COUNTRIES: "de ro at hu" },
    });
    assert.equal(result.status, 1);
    const calls = readFileSync(h.log, "utf8");
    const runCalls = calls.split("\n").filter((line) => line.includes(" run "));
    assert.equal(runCalls.length, 4);
    assert.ok(runCalls[0].includes("COUNTRY_CODE=de"));
    assert.ok(runCalls[1].includes("COUNTRY_CODE=ro"));
    assert.ok(runCalls[2].includes("COUNTRY_CODE=at"));
    assert.ok(runCalls[3].includes("COUNTRY_CODE=hu"));
    assert.match(result.stderr, /country=ro result=failed exit=23/);
    assert.match(result.stdout, /country=hu result=success/);
  } finally {
    rmSync(h.root, { recursive: true, force: true });
  }
});

test("targeted retry runs only the requested country and rejects unknown codes", () => {
  const h = harness();
  try {
    const result = spawnSync("/bin/sh", [h.script, "ro"], {
      encoding: "utf8",
      env: { ...process.env, TEST_LOG: h.log, TEST_COUNTRIES: "de ro at hu" },
    });
    assert.equal(result.status, 23);
    assert.equal(readFileSync(h.log, "utf8").trim().split("\n").length, 1);
    assert.match(readFileSync(h.log, "utf8"), /COUNTRY_CODE=ro/);

    const invalid = spawnSync("/bin/sh", [h.script, "fr"], {
      encoding: "utf8",
      env: { ...process.env, TEST_LOG: h.log, TEST_COUNTRIES: "de ro at hu" },
    });
    assert.equal(invalid.status, 2);
    assert.match(invalid.stderr, /UNSUPPORTED_COUNTRY/);
  } finally {
    rmSync(h.root, { recursive: true, force: true });
  }
});
