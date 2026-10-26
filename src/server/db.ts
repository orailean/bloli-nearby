import pg from "pg";
import { readFile } from "node:fs/promises";
export const createPool = (url = process.env.DATABASE_URL) =>
  new pg.Pool({
    connectionString: url,
    max: 8,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
    statement_timeout: 30000,
  });
export async function migrate(pool: pg.Pool) {
  await pool.query(
    await readFile(new URL("./schema.sql", import.meta.url), "utf8"),
  );
}
