import { spawn } from "node:child_process";
import { createPool, migrate } from "./db.js";
import { runRefresh } from "./refresh.js";
import { importFile } from "./import-file.js";
const pool = createPool();
try {
  await migrate(pool);
  const result = await runRefresh(
    pool,
    process.env.DATA_URL ||
      "https://download.geofabrik.de/europe/germany-latest.osm.pbf",
    async (context) => {
      await new Promise<void>((resolve, reject) => {
        const child = spawn("/bin/sh", ["/app/importer/prepare.sh"], {
          stdio: "inherit",
        });
        const stop = () => child.kill("SIGTERM");
        process.once("SIGTERM", stop);
        process.once("SIGINT", stop);
        child.once("error", reject);
        child.once("exit", (code) => {
          process.removeListener("SIGTERM", stop);
          process.removeListener("SIGINT", stop);
          code === 0
            ? resolve()
            : reject(new Error("SOURCE_PREPARATION_FAILED"));
        });
      });
      return importFile(pool, "/data/extracted.jsonl", context);
    },
  );
  console.log(JSON.stringify({ status: "success", ...result }));
} finally {
  await pool.end();
}
