import type pg from "pg";
// Runs after publication returns, outside the refresh/job transaction. A failure
// cannot turn committed data into a failed/rolled-back import.
export async function analyzePublishedDataset(
  db: Pick<pg.Pool, "query">,
): Promise<{ status: "success" } | { status: "failed"; error: string }> {
  try {
    for (const table of [
      "locations",
      "location_categories",
      "transit_components",
      "settlements",
      "facilities",
    ])
      await db.query(`ANALYZE ${table}`);
    return { status: "success" };
  } catch {
    return { status: "failed", error: "STATISTICS_REFRESH_FAILED" };
  }
}
