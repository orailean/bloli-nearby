import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import type pg from "pg";
import { importDataset } from "./import.js";
import type { RefreshContext } from "./refresh.js";
export async function importFile(
  pool: pg.Pool,
  path: string,
  context?: RefreshContext,
) {
  const lines = createInterface({
    input: createReadStream(path),
    crlfDelay: Infinity,
  });
  const iterator = lines[Symbol.asyncIterator]();
  const first = await iterator.next();
  if (first.done) throw new Error("EMPTY_IMPORT");
  const meta = JSON.parse(first.value);
  if (meta.kind !== "metadata") throw new Error("MISSING_IMPORT_METADATA");
  if (
    meta.categories?.includes("transit") &&
    meta.transitContextComplete !== true
  )
    throw new Error("INCOMPLETE_TRANSIT_CONTEXT");
  async function* records() {
    let count = 0,
      complete = false;
    for await (const line of { [Symbol.asyncIterator]: () => iterator }) {
      const row = JSON.parse(line);
      if (complete) throw new Error("DATA_AFTER_COMPLETION");
      if (row.kind === "complete") {
        if (row.records !== count) throw new Error("INCOMPLETE_IMPORT");
        complete = true;
      } else {
        count++;
        yield row;
      }
    }
    if (!complete) throw new Error("INCOMPLETE_IMPORT");
  }

  try {
    return await importDataset(
      pool,
      records(),
      {
        ...meta,
        minimumFacilities: Number(process.env.MIN_FACILITIES || 1000),
        minimumSettlements: Number(process.env.MIN_SETTLEMENTS || 1000),
        minimumSellers: Number(process.env.MIN_SELLERS || 100),
        minimumTransit: Number(process.env.MIN_TRANSIT_STOPS || 1000),
        minimumChargeStations: Number(process.env.MIN_CHARGE_STATIONS || 100),
        minimumWaterPoints: Number(process.env.MIN_WATER_POINTS || 100),
        minimumKebabs: Number(process.env.MIN_KEBABS || 100),
        minimumRatio: Number(process.env.MIN_IMPORT_RATIO || 0.75),
      },
      context,
    );
  } finally {
    lines.close();
  }
}
