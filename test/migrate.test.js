import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runMigrations } from "../src/db/migrate.js";

function createDatabase(applied = []) {
  const calls = [];
  const appliedFiles = new Set(applied);
  const client = {
    async query(text, params = []) {
      calls.push({ text: String(text), params });
      if (String(text).startsWith("SELECT 1 FROM schema_migrations")) {
        return { rowCount: appliedFiles.has(params[0]) ? 1 : 0, rows: [] };
      }
      if (String(text).startsWith("INSERT INTO schema_migrations")) {
        appliedFiles.add(params[0]);
      }
      return { rowCount: 0, rows: [] };
    },
    release() {
      calls.push({ text: "RELEASE" });
    }
  };
  return { calls, appliedFiles, async connect() { return client; } };
}

test("applies pending migrations once and records them", async () => {
  const migrationsDir = await mkdtemp(join(tmpdir(), "streetwise-migrations-"));
  await writeFile(join(migrationsDir, "002_second.sql"), "SELECT 2;");
  await writeFile(join(migrationsDir, "001_first.sql"), "SELECT 1;");
  const database = createDatabase(["001_first.sql"]);

  const applied = await runMigrations(database, { migrationsDir, log: () => {} });

  assert.deepEqual(applied, ["002_second.sql"]);
  assert.deepEqual([...database.appliedFiles].sort(), ["001_first.sql", "002_second.sql"]);
  assert.ok(database.calls.some((call) => call.text === "BEGIN"));
  assert.ok(database.calls.some((call) => call.text === "COMMIT"));
  assert.ok(database.calls.some((call) => call.text === "RELEASE"));
});

test("rolls back a failed migration and still releases the database connection", async () => {
  const migrationsDir = await mkdtemp(join(tmpdir(), "streetwise-migrations-"));
  await writeFile(join(migrationsDir, "001_failure.sql"), "FAIL_MIGRATION;");
  const database = createDatabase();
  const originalConnect = database.connect;
  database.connect = async () => {
    const client = await originalConnect();
    const originalQuery = client.query.bind(client);
    client.query = async (text, params) => {
      if (String(text).includes("FAIL_MIGRATION")) throw new Error("migration_failed");
      return originalQuery(text, params);
    };
    return client;
  };

  await assert.rejects(
    runMigrations(database, { migrationsDir, log: () => {} }),
    /migration_failed/
  );
  assert.ok(database.calls.some((call) => call.text === "ROLLBACK"));
  assert.ok(database.calls.some((call) => call.text === "RELEASE"));
});
