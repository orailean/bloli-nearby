import { readFileSync } from "node:fs";
import { createPool, migrate } from "./db.js";
import { importFile } from "./import-file.js";
if (process.env.DATABASE_PASSWORD_FILE)
  process.env.DATABASE_URL = `postgres://loo:${encodeURIComponent(readFileSync(process.env.DATABASE_PASSWORD_FILE, "utf8").trim())}@db:5432/loo`;
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
