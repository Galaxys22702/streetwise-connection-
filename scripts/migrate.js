import { pool } from "../src/db/index.js";
import { runMigrations } from "../src/db/migrate.js";

if (!pool) {
  console.error("DATABASE_URL is required to run migrations.");
  process.exit(1);
}

try {
  const applied = await runMigrations(pool);
  if (!applied.length) console.log("No pending migrations.");
  console.log("Migrations complete.");
} finally {
  await pool.end();
}
