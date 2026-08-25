import { setTimeout as delay } from "node:timers/promises";
import { pool } from "../src/db/index.js";
import { runMigrations } from "../src/db/migrate.js";

if (!pool) {
  console.error("DATABASE_URL is required to start the hosted service.");
  process.exit(1);
}

const maxAttempts = Math.max(1, Number(process.env.MIGRATION_MAX_ATTEMPTS || 10));

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  try {
    await runMigrations(pool);
    console.log("Database migrations are ready.");
    break;
  } catch (error) {
    if (attempt === maxAttempts) {
      console.error("Database migrations could not be completed.", error);
      process.exit(1);
    }
    const waitMs = attempt * 1_000;
    console.warn(`Database not ready (attempt ${attempt}/${maxAttempts}); retrying in ${waitMs}ms.`);
    await delay(waitMs);
  }
}

await import("../src/server.js");
