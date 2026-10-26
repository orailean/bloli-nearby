import { createPool, migrate } from "./db.js";
import { importFile } from "./import-file.js";
const path = process.argv[2];
if (!path) throw new Error("Usage: npm run import -- FILE.jsonl");
const pool = createPool();
try {
  await migrate(pool);
  console.log(
    JSON.stringify({ status: "success", ...(await importFile(pool, path)) }),
  );
} finally {
  await pool.end();
}
