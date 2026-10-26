import { readFileSync } from "node:fs";
import { createPool, migrate } from "./db.js";
import { createApi } from "./api.js";
if (process.env.DATABASE_PASSWORD_FILE)
  process.env.DATABASE_URL = `postgres://loo:${encodeURIComponent(readFileSync(process.env.DATABASE_PASSWORD_FILE, "utf8").trim())}@db:5432/loo`;
const pool = createPool();
await migrate(pool);
const server = createApi(pool, {
  tileUrl: process.env.TILE_URL,
  tileAttribution: process.env.TILE_ATTRIBUTION,
  tileMaxZoom: Number(process.env.TILE_MAX_ZOOM || 19),
  contactEmail: process.env.CONTACT_EMAIL,
});
server.listen(
  Number(process.env.PORT || 3100),
  process.env.HOST || "0.0.0.0",
  () => console.log("Find a Loo API listening"),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () =>
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    }),
  );
