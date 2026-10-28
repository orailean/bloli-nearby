import type pg from "pg";
import { AppError } from "../shared/domain.js";
import type { CountryCode } from "../shared/countries.js";
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
    const result = await work({ db, jobId: jobId!, countryCode });
    await db.query(
      "UPDATE import_jobs SET status='success',finished_at=now() WHERE id=$1 AND status='running'",
      [jobId],
    );
    return result;
  } catch (error) {
    await db.query("ROLLBACK");
    if (jobId)
      await db.query(
        "UPDATE import_jobs SET status='failed',finished_at=now(),error=$2 WHERE id=$1",
        [jobId, error instanceof AppError ? error.code : "IMPORT_FAILED"],
      );
    throw error;
  } finally {
    if (locked) await db.query("SELECT pg_advisory_unlock(194159)");
    db.release();
  }
}
