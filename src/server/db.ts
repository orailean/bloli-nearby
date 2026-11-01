import { readFileSync } from "node:fs";
import pg from "pg";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { logEvent } from "./log.js";
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
export async function migrate(
  pool: pg.Pool,
  { attempts = 5, retryDelayMs = 1000 } = {},
) {
  const schema = await readFile(
    new URL("./schema.sql", import.meta.url),
    "utf8",
  );
  const checksum = createHash("sha256").update(schema).digest("hex");
  const client = await pool.connect();
  const started = performance.now();
  const elapsed = () => Math.round(performance.now() - started);
  try {
    // The idempotent schema takes exclusive table locks even when nothing
    // changes, which deadlocks against live API reads. Skip an applied version.
    const applied = await client.query(
      "SELECT to_regclass('schema_state') IS NOT NULL AS ready",
    );
    if (
      applied.rows[0]?.ready &&
      (
        await client.query("SELECT 1 FROM schema_state WHERE checksum=$1", [
          checksum,
        ])
      ).rows.length
    ) {
      logEvent("info", "schema_migration", {
        status: "skipped",
        durationMs: elapsed(),
      });
      return;
    }
    // Schema backfills may touch every existing OSM row. Keep the normal
    // request timeout for searches, but do not interrupt a one-time migration.
    await client.query("SET statement_timeout = 0");
    let attempt = 1;
    for (; ; attempt++) {
      try {
        await client.query(schema);
        break;
      } catch (error) {
        // The script runs as one implicit transaction, so a deadlock victim
        // rolls back completely and can safely run again.
        if (
          (error as { code?: string }).code !== "40P01" ||
          attempt >= attempts
        )
          throw error;
        logEvent("warn", "schema_migration_retry", { attempt, code: "40P01" });
        await new Promise((resolve) =>
          setTimeout(resolve, attempt * retryDelayMs),
        );
      }
    }
    await client.query(
      "INSERT INTO schema_state(checksum) VALUES($1) ON CONFLICT(singleton) DO UPDATE SET checksum=EXCLUDED.checksum,applied_at=now()",
      [checksum],
    );
    logEvent("info", "schema_migration", {
      status: "applied",
      attempts: attempt,
      durationMs: elapsed(),
    });
  } finally {
    try {
      await client.query("SET statement_timeout = 30000");
    } finally {
      client.release();
    }
  }
}
