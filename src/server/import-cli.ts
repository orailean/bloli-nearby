import { analyzePublishedDataset } from "./import-maintenance.js";
import { createPool, migrate } from "./db.js";
import { importFile } from "./import-file.js";
const path = process.argv[2];
if (!path) throw new Error("Usage: npm run import -- FILE.jsonl");
const pool = createPool();
try {
  await migrate(pool);
  const result = await importFile(pool, path);
  console.log(
    JSON.stringify({
      status: "success",
      published: true,
      ...result,
      statistics: await analyzePublishedDataset(pool),
    }),
  );
} finally {
  await pool.end();
}
