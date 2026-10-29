import { analyzePublishedDataset } from "./import-maintenance.js";
import { spawn } from "node:child_process";
import { createPool, migrate } from "./db.js";
import { runRefresh } from "./refresh.js";
import { importFile } from "./import-file.js";
import type { CountryCode } from "../shared/countries.js";
const pool = createPool();
const measureOnly = process.env.MEASURE_ONLY === "1";
async function prepare() {
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
      code === 0 ? resolve() : reject(new Error("SOURCE_PREPARATION_FAILED"));
    });
  });
}
try {
  await migrate(pool);
  const countryCode = (process.env.COUNTRY_CODE || "de") as CountryCode;
  const path = `/data/countries/${countryCode}/extracted.jsonl`;
  const result = measureOnly
    ? await (async () => {
        await prepare();
        return importFile(pool, path, undefined, true);
      })()
    : await runRefresh(
        pool,
        process.env.DATA_URL ||
          "https://download.geofabrik.de/europe/germany-latest.osm.pbf",
        async (context) => {
          await prepare();
          return importFile(pool, path, context);
        },
        countryCode,
      );
  console.log(
    JSON.stringify({
      status: "success",
      published: !measureOnly,
      ...result,
      statistics: measureOnly
        ? { status: "skipped" }
        : await analyzePublishedDataset(pool),
    }),
  );
} finally {
  await pool.end();
}
