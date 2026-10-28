import test from "node:test";
import assert from "node:assert/strict";
import { analyzePublishedDataset } from "../src/server/import-maintenance.js";
test("Post-publication maintenance failure reports separately without throwing", async () => {
  const db = {
    query: async () => {
      throw new Error("statistics unavailable");
    },
  };
  const result = await analyzePublishedDataset(db as any);
  assert.deepEqual(result, {
    status: "failed",
    error: "STATISTICS_REFRESH_FAILED",
  });
});
