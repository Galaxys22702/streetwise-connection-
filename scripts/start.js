import { setTimeout as delay } from "node:timers/promises";
import { integerEnv } from "../src/config/env.js";
import { pool } from "../src/db/index.js";
import { runMigrations } from "../src/db/migrate.js";

try {
  await import("./launch-readiness-check.js");
} catch (error) {
  console.error("Launch readiness check failed.", error?.message || "unknown_error");
  process.exit(1);
}

if (!pool) {
  console.error("DATABASE_URL is required to start the hosted service.");
  process.exit(1);
}

let maxAttempts;
try {
  maxAttempts = integerEnv("MIGRATION_MAX_ATTEMPTS", { fallback: 10, min: 1, max: 30 });
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

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
