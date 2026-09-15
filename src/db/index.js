import pg from "pg";
import { integerEnv } from "../config/env.js";

const { Pool } = pg;
const connectionString = String(process.env.DATABASE_URL || "").trim();
const databaseSslSetting = String(process.env.DATABASE_SSL || "").trim().toLowerCase();
const configuredPoolMax = integerEnv("DATABASE_POOL_MAX", { fallback: 10, min: 1, max: 100 });

if (databaseSslSetting && !["true", "false"].includes(databaseSslSetting)) {
  throw new Error("DATABASE_SSL must be either true or false when set.");
}

export const databaseConfigured = Boolean(connectionString);

export const pool = databaseConfigured
  ? new Pool({
      connectionString,
      ssl: databaseSslSetting === "true" ? { rejectUnauthorized: true } : undefined,
      max: configuredPoolMax,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000
    })
  : null;

if (pool) {
  pool.on("error", () => {
    console.error("Unexpected idle database client error.");
  });
}

export async function query(text, params = []) {
  if (!pool) {
    const error = new Error("database_not_configured");
    error.statusCode = 503;
    throw error;
  }
  return pool.query(text, params);
}

export async function withTransaction(work) {
  if (!pool) {
    const error = new Error("database_not_configured");
    error.statusCode = 503;
    throw error;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    throw error;
  } finally {
    client.release();
  }
}

export async function databaseStatus() {
  if (!pool) return { configured: false, connected: false };

  try {
    await pool.query("SELECT 1");
    return { configured: true, connected: true };
  } catch {
    return {
      configured: true,
      connected: false
    };
  }
}
