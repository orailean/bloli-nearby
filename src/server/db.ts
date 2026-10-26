import { readFileSync } from "node:fs";
import pg from "pg";
import { readFile } from "node:fs/promises";
export function databaseOptions(
  env: NodeJS.ProcessEnv = process.env,
  readSecret: (path: string) => string = (path) =>
    readFileSync(path, "utf8").trim(),
): pg.PoolConfig {
  if (env.DATABASE_PASSWORD_FILE)
    return {
      host: env.DB_HOST || "db",
      port: Number(env.DB_PORT || 5432),
      user: env.DB_USER || "bloli",
      database: env.DB_NAME || "bloli_nearby",
      password: readSecret(env.DATABASE_PASSWORD_FILE),
    };
  return { connectionString: env.DATABASE_URL };
}
export const createPool = (url?: string) =>
  new pg.Pool({
    ...(url ? { connectionString: url } : databaseOptions()),
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
