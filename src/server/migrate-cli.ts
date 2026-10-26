import { createPool, migrate } from "./db.js";
const pool = createPool();
try {
  await migrate(pool);
} finally {
  await pool.end();
}
