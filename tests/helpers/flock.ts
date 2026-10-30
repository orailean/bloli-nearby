import { writeFileSync } from "node:fs";
import { join } from "node:path";

// macOS lacks the Linux flock CLI. fcntl.flock uses the same inherited-fd
// semantics, so tests exercise a real OS lock rather than a no-op stub.
export function installFlockShim(directory: string) {
  writeFileSync(join(directory, "flock"), '#!/usr/bin/env python3\nimport fcntl,sys\ntry: fcntl.flock(int(sys.argv[-1]), fcntl.LOCK_EX|fcntl.LOCK_NB)\nexcept BlockingIOError: sys.exit(1)\n', { mode: 0o755 });
}
