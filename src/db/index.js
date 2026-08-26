import pg from "pg";

const { Pool } = pg;
const connectionString = String(process.env.DATABASE_URL || "").trim();

export const databaseConfigured = Boolean(connectionString);

export const pool = databaseConfigured
  ? new Pool({
      connectionString,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.DATABASE_POOL_MAX || 10)
    })
  : null;

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
  } catch (error) {
    return {
      configured: true,
      connected: false,
      error: error.message
    };
  }
}
