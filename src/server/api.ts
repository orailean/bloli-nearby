import { createServer } from "node:http";
import type pg from "pg";
import type { AppConfig } from "../shared/types.js";
import { AppError, parseSearch } from "../shared/domain.js";
import {
  datasetStatus,
  searchToilets,
  searchSettlements,
} from "./repository.js";
export function createApi(pool: pg.Pool, config: Partial<AppConfig> = {}) {
  return createServer(async (req, res) => {
    const send = (status: number, body: unknown) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(JSON.stringify(body));
    };
    try {
      if (req.method !== "GET" && req.method !== "HEAD")
        return send(405, { error: "METHOD_NOT_ALLOWED" });
      const u = new URL(req.url || "/", "http://localhost");
      if (u.pathname === "/api/health") return send(200, { ok: true });
      if (u.pathname === "/api/config")
        return send(200, {
          tileUrl:
            config.tileUrl ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          tileAttribution:
            config.tileAttribution ?? "© OpenStreetMap contributors",
          tileMaxZoom: config.tileMaxZoom ?? 19,
          contactEmail: config.contactEmail ?? "",
        });
      if (u.pathname === "/api/status" || u.pathname === "/api/ready") {
        const dataset = await datasetStatus(pool);
        return send(
          u.pathname === "/api/ready" && !dataset.ready ? 503 : 200,
          dataset,
        );
      }
      if (u.pathname === "/api/toilets")
        return send(
          200,
          await searchToilets(pool, parseSearch(u.searchParams)),
        );
      if (u.pathname === "/api/settlements")
        return send(200, {
          items: await searchSettlements(
            pool,
            (u.searchParams.get("q") || "").trim(),
          ),
        });
      return send(404, { error: "NOT_FOUND" });
    } catch (error) {
      if (error instanceof AppError)
        return send(error.status, { error: error.code });
      // Never log request URLs, query coordinates, connection strings, or raw database errors.
      console.error("api_operation_failed");
      return send(503, { error: "SERVICE_UNAVAILABLE" });
    }
  });
}
