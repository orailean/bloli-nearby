import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
for (const valid of [true, false])
  test(`backup ${valid ? "prunes older verified dumps" : "keeps the previous dump if verification fails"}`, () => {
    const directory = mkdtempSync(join(tmpdir(), "bloli-backup-"));
    try {
      mkdirSync(join(directory, "scripts"));
      mkdirSync(join(directory, "backups"));
      copyFileSync("scripts/backup.sh", join(directory, "scripts/backup.sh"));
      writeFileSync(
        join(directory, "scripts/compose.sh"),
        `#!/bin/sh
case "$*" in
  *pg_dump*) printf 'archive-data' ;;
  *pg_restore*) cat >/dev/null; exit ${valid ? 0 : 1} ;;
esac
`,
        { mode: 0o755 },
      );
      const old = "bloli-nearby-20200101T000000Z.dump";
      writeFileSync(join(directory, "backups", old), "old-known-backup");
      writeFileSync(
        join(directory, "backups", "unrelated.dump"),
        "unrelated-backup",
      );
      const result = spawnSync(
        "/bin/sh",
        [join(directory, "scripts/backup.sh")],
        { encoding: "utf8" },
      );
      if (valid) {
        assert.equal(result.status, 0, result.stderr);
        const dumps = readdirSync(join(directory, "backups")).filter((file) =>
          /^bloli-nearby-\d{8}T\d{6}Z\.dump$/.test(file),
        );
        assert.equal(dumps.length, 1);
        assert.notEqual(dumps[0], old);
        assert.equal(
          readFileSync(join(directory, "backups", dumps[0]), "utf8"),
          "archive-data",
        );
      } else {
        assert.notEqual(result.status, 0);
        assert.equal(
          readFileSync(join(directory, "backups", old), "utf8"),
          "old-known-backup",
        );
      }
      assert.equal(
        readFileSync(join(directory, "backups", "unrelated.dump"), "utf8"),
        "unrelated-backup",
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

test("an overlapping backup cannot overwrite or prune the current dump", () => {
  const directory = mkdtempSync(join(tmpdir(), "bloli-backup-lock-"));
  try {
    mkdirSync(join(directory, "scripts"));
    mkdirSync(join(directory, "backups"));
    mkdirSync(join(directory, "backups", ".backup.lock"));
    copyFileSync("scripts/backup.sh", join(directory, "scripts/backup.sh"));
    writeFileSync(
      join(directory, "scripts/compose.sh"),
      "#!/bin/sh\ncat >/dev/null\nprintf archive-data\n",
      { mode: 0o755 },
    );
    const old = "bloli-nearby-20200101T000000Z.dump";
    writeFileSync(join(directory, "backups", old), "only-good-backup");
    const result = spawnSync(
      "/bin/sh",
      [join(directory, "scripts/backup.sh")],
      { encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    assert.equal(
      readFileSync(join(directory, "backups", old), "utf8"),
      "only-good-backup",
    );
    assert.deepEqual(
      readdirSync(join(directory, "backups")).sort(),
      [".backup.lock", old].sort(),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
