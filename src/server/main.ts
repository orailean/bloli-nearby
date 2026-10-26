import { createPool, migrate } from "./db.js";
import { createApi } from "./api.js";
const pool = createPool();
await migrate(pool);
const server = createApi(pool, {
  tileUrl: process.env.TILE_URL || undefined,
  tileAttribution: process.env.TILE_ATTRIBUTION,
  tileMaxZoom: Number(process.env.TILE_MAX_ZOOM || 19),
  contactEmail: process.env.CONTACT_EMAIL,
});
server.listen(
  Number(process.env.PORT || 3100),
  process.env.HOST || "0.0.0.0",
  () => console.log("Bloli Nearby API listening"),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () =>
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    }),
  );
