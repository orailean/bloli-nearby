import type pg from "pg";
import { AppError } from "../shared/domain.js";
import type { CountryCode } from "../shared/countries.js";
import { performance } from "node:perf_hooks";
import { logEvent, sanitizeError, sanitizeText } from "./log.js";
export interface RefreshContext {
  db: pg.PoolClient;
  jobId: string;
  countryCode: CountryCode;
}
export async function runRefresh<T>(
  pool: pg.Pool,
  source: string,
  work: (context: RefreshContext) => Promise<T>,
  countryCode: CountryCode = "de",
): Promise<T> {
  const db = await pool.connect();
  const started = performance.now();
  let locked = false,
    jobId: string | undefined;
  try {
    locked = (await db.query("SELECT pg_try_advisory_lock(194159) AS locked"))
      .rows[0].locked;
    if (!locked) throw new AppError("IMPORT_LOCKED", 409);
    // No other refresh can still own these jobs once the session lock is acquired.
    await db.query(
      "UPDATE import_jobs SET status='failed',finished_at=now(),error='IMPORT_INTERRUPTED' WHERE status='running' AND country_code=$1",
      [countryCode],
    );
    jobId = (
      await db.query(
        "INSERT INTO import_jobs(status,source,country_code) VALUES('running',$1,$2) RETURNING id",
        [source,countryCode],
      )
    ).rows[0].id;
    logEvent("info", "import_started", {
      country: countryCode,
      jobId,
      source: sanitizeText(source),
    });
    const result = await work({ db, jobId: jobId!, countryCode });
    await db.query(
      "UPDATE import_jobs SET status='success',finished_at=now() WHERE id=$1 AND status='running'",
      [jobId],
    );
    logEvent("info", "import_finished", {
      country: countryCode,
      jobId,
      status: "success",
      durationMs: Math.round(performance.now() - started),
      counts: counts(result),
    });
    return result;
  } catch (error) {
    await db.query("ROLLBACK");
    if (jobId)
      await db.query(
        "UPDATE import_jobs SET status='failed',finished_at=now(),error=$2 WHERE id=$1",
        [jobId, error instanceof AppError ? error.code : "IMPORT_FAILED"],
      );
    logEvent("error", "import_finished", {
      country: countryCode,
      jobId,
      status: "failed",
      durationMs: Math.round(performance.now() - started),
      error: sanitizeError(error),
    });
    throw error;
  } finally {
    if (locked) await db.query("SELECT pg_advisory_unlock(194159)");
    db.release();
  }
}
// Top-level numeric totals only: one event per import, never per feature.
function counts(result: unknown) {
  if (!result || typeof result !== "object") return undefined;
  const totals = Object.entries(result).filter(
    (entry): entry is [string, number] => typeof entry[1] === "number",
  );
  return totals.length ? Object.fromEntries(totals) : undefined;
}
