import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import type pg from "pg";
import { importDataset } from "./import.js";
import type { RefreshContext } from "./refresh.js";
import {
  minimumForCountry,
  minimumSettlementsForCountry,
} from "../shared/countries.js";
import type { CountryCode } from "../shared/countries.js";
export async function importFile(
  pool: pg.Pool,
  path: string,
  context?: RefreshContext,
  measureOnly = false,
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
    const countryCode = (meta.countryCode || "de") as CountryCode;
    return await importDataset(
      pool,
      records(),
      {
        ...meta,
        countryCode,
        measureOnly,
        sourceChecksum: meta.sourceChecksum,
        boundarySource: meta.coverageSource,
        boundaryChecksum: meta.coverageChecksum,
        minimumViews: minimumForCountry(countryCode, "view"),
        minimumSights: minimumForCountry(countryCode, "sights"),
        minimumVending: minimumForCountry(countryCode, "vending"),
        minimumAtms: minimumForCountry(countryCode, "atm"),
        minimumAccommodations: minimumForCountry(countryCode, "accommodation"),
        minimumFacilities: minimumForCountry(countryCode, "toilets"),
        minimumSettlements: minimumSettlementsForCountry(countryCode),
        minimumSellers: minimumForCountry(countryCode, "tobacco"),
        minimumTransit: minimumForCountry(countryCode, "transit"),
        minimumChargeStations: minimumForCountry(countryCode, "charge"),
        minimumWaterPoints: minimumForCountry(countryCode, "water"),
        minimumKebabs: minimumForCountry(countryCode, "kebab"),
        minimumRatio: Number(process.env.MIN_IMPORT_RATIO || 0.75),
      },
      context,
    );
  } finally {
    lines.close();
  }
}
