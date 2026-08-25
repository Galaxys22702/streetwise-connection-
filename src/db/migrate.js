import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const DEFAULT_MIGRATIONS_DIR = fileURLToPath(new URL("../../db/migrations/", import.meta.url));
const MIGRATION_LOCK_NAME = "streetwise_connection_migrations";

export async function runMigrations(databasePool, {
  migrationsDir = DEFAULT_MIGRATIONS_DIR,
  log = console.log
} = {}) {
  if (!databasePool) {
    const error = new Error("database_not_configured");
    error.statusCode = 503;
    throw error;
  }

  const client = await databasePool.connect();
  const applied = [];

  try {
    // A deploy and a manual migration can overlap. Keep the schema changes serialized.
    await client.query("SELECT pg_advisory_lock(hashtext($1))", [MIGRATION_LOCK_NAME]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const files = (await readdir(migrationsDir))
      .filter((name) => name.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const alreadyApplied = await client.query(
        "SELECT 1 FROM schema_migrations WHERE filename = $1",
        [file]
      );
      if (alreadyApplied.rowCount) {
        log(`Skipping ${file} (already applied)`);
        continue;
      }

      const sql = await readFile(join(migrationsDir, file), "utf8");
      if (!sql.trim()) continue;

      log(`Applying ${file}`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
        await client.query("COMMIT");
        applied.push(file);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    return applied;
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock(hashtext($1))", [MIGRATION_LOCK_NAME]);
    } finally {
      client.release();
    }
  }
}
