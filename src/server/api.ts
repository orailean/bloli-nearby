import { resolveSite } from "../shared/sites.js";
import { COUNTRIES, type CountryCode } from "../shared/countries.js";
import { createServer } from "node:http";
import type pg from "pg";
import type { AppConfig } from "../shared/types.js";
import { AppError, parseSearch } from "../shared/domain.js";
import {
  datasetStatus,
  searchToilets,
  searchLocations,
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
      const production = process.env.NODE_ENV === "production";
      if (production && u.searchParams.has("site"))
        return send(400, { error: "INVALID_QUERY" });
      const site = resolveSite(
        req.headers.host || "",
        production,
        u.searchParams.get("site") || process.env.DEV_SITE,
      );
      if (!site) return send(421, { error: "UNKNOWN_SITE" });
      if (u.pathname === "/api/site") return send(200, site);
      if (u.pathname === "/api/config")
        return send(200, {
          site,
          tileUrl:
            config.tileUrl ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          tileAttribution:
            config.tileAttribution ?? "© OpenStreetMap contributors",
          tileMaxZoom: config.tileMaxZoom ?? 19,
          contactEmail: config.contactEmail ?? "",
        });
      if (u.pathname === "/api/status" || u.pathname === "/api/ready") {
        const dataset = await datasetStatus(pool, site.category);
        return send(
          u.pathname === "/api/ready" && !dataset.ready ? 503 : 200,
          dataset,
        );
      }
      if (u.pathname === "/api/locations")
        return send(
          200,
          await searchLocations(
            pool,
            parseSearch(u.searchParams, site.category),
            site.category,
          ),
        );
      if (u.pathname === "/api/toilets" && site.id === "loo")
        return send(
          200,
          await searchToilets(pool, parseSearch(u.searchParams)),
        );
      if (u.pathname === "/api/settlements")
        {
          const countryValues = u.searchParams.getAll("country");
          const selectedCountry = countryValues[0] ?? "all";
          if (
            countryValues.length > 1 ||
            (selectedCountry !== "all" &&
              !COUNTRIES.some((country) => country.code === selectedCountry))
          )
            throw new AppError("INVALID_QUERY");
          return send(200, {
            items: await searchSettlements(
              pool,
              (u.searchParams.get("q") || "").trim(),
              site.category,
              selectedCountry as CountryCode | "all",
            ),
          });
        }
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
