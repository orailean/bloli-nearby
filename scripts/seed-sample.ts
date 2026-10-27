import { createPool, migrate } from "../src/server/db.js";
import { importFile } from "../src/server/import-file.js";
const databaseUrl = process.env.DATABASE_URL;
if (
  process.env.NODE_ENV === "production" ||
  !databaseUrl ||
  !["localhost", "127.0.0.1", "[::1]"].includes(new URL(databaseUrl).hostname)
)
  throw new Error("Sample seed requires a local development database");
const pool = createPool(databaseUrl);
try {
  await migrate(pool);
  const count = Number(
    (await pool.query("SELECT count(*) AS n FROM dataset")).rows[0].n,
  );
  if (count)
    throw new Error(
      "Use a fresh development database; sample seeding will not replace an existing dataset",
    );
  process.env.MIN_FACILITIES = "1";
  process.env.MIN_SETTLEMENTS = "1";
  process.env.MIN_SELLERS = "1";
  process.env.MIN_KEBABS = "1";
  process.env.MIN_WATER_POINTS = "1";
  console.log(await importFile(pool, "tests/fixtures/multi-site.jsonl"));
} finally {
  await pool.end();
}
