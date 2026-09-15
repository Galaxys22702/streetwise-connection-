import { setTimeout as delay } from "node:timers/promises";
import { pool } from "../src/db/index.js";
import { runMigrations } from "../src/db/migrate.js";

if (!pool) {
  console.error("DATABASE_URL is required to start the hosted service.");
  process.exit(1);
}

const configuredMaxAttempts = Number(process.env.MIGRATION_MAX_ATTEMPTS ?? 10);
if (!Number.isInteger(configuredMaxAttempts) || configuredMaxAttempts < 1 || configuredMaxAttempts > 30) {
  console.error("MIGRATION_MAX_ATTEMPTS must be an integer between 1 and 30.");
  process.exit(1);
}
const maxAttempts = configuredMaxAttempts;

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  try {
    await runMigrations(pool);
    console.log("Database migrations are ready.");
    break;
  } catch (error) {
    if (attempt === maxAttempts) {
      console.error(
        "Database migrations could not be completed.",
        error?.code ? `code=${error.code}` : ""
      );
      process.exit(1);
    }
    const waitMs = attempt * 1_000;
    console.warn(`Database not ready (attempt ${attempt}/${maxAttempts}); retrying in ${waitMs}ms.`);
    await delay(waitMs);
  }
}

await import("../src/server.js");
