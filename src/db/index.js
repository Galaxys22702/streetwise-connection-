import pg from "pg";

const { Pool } = pg;
const connectionString = String(process.env.DATABASE_URL || "").trim();
const databaseSslSetting = String(process.env.DATABASE_SSL || "").trim().toLowerCase();
const configuredPoolMax = Number(process.env.DATABASE_POOL_MAX ?? 10);

if (databaseSslSetting && !["true", "false"].includes(databaseSslSetting)) {
  throw new Error("DATABASE_SSL must be either true or false when set.");
}
if (!Number.isInteger(configuredPoolMax) || configuredPoolMax < 1 || configuredPoolMax > 100) {
  throw new Error("DATABASE_POOL_MAX must be an integer between 1 and 100.");
}

export const databaseConfigured = Boolean(connectionString);

export const pool = databaseConfigured
  ? new Pool({
      connectionString,
      ssl: databaseSslSetting === "true" ? { rejectUnauthorized: false } : undefined,
      max: configuredPoolMax
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
  } catch {
    return {
      configured: true,
      connected: false
    };
  }
}
