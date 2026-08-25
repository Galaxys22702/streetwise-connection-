import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { pool } from "../src/db/index.js";

if (!pool) {
  console.error("DATABASE_URL is required to run migrations.");
  process.exit(1);
}

const migrationsDir = fileURLToPath(new URL("../db/migrations/", import.meta.url));
const files = (await readdir(migrationsDir)).filter((name) => name.endsWith(".sql")).sort();

try {
  for (const file of files) {
    const sql = await readFile(join(migrationsDir, file), "utf8");
    console.log(`Applying ${file}`);
    await pool.query(sql);
  }
  console.log("Migrations complete.");
} finally {
  await pool.end();
}
