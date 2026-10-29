import { analyzePublishedDataset } from "./import-maintenance.js";
import { createPool, migrate } from "./db.js";
import { importFile } from "./import-file.js";
const measureOnly = process.argv.includes("--measure-only");
const path = process.argv.slice(2).find((arg) => arg !== "--measure-only");
if (!path) throw new Error("Usage: npm run import -- FILE.jsonl");
const pool = createPool();
try {
  await migrate(pool);
  const result = await importFile(pool, path, undefined, measureOnly);
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
