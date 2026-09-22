import {
  createCipheriv,
  createDecipheriv,
  randomBytes
} from "node:crypto";
import { query } from "../db/index.js";

const GCM_AUTH_TAG_BYTES = 16;

function configurationError(message) {
  const error = new Error(message);
  error.statusCode = 503;
  return error;
}

function tokenEncryptionKey(env = process.env) {
  const raw = String(env.META_TOKEN_ENCRYPTION_KEY || "").trim();
  if (!raw) throw configurationError("meta_token_encryption_key_not_configured");

  let key;
  if (/^[0-9a-f]{64}$/i.test(raw)) {
    key = Buffer.from(raw, "hex");
  } else {
    try {
      key = Buffer.from(raw, "base64url");
    } catch {
      key = Buffer.alloc(0);
    }
  }

  if (key.length !== 32) {
    throw configurationError("meta_token_encryption_key_must_be_32_bytes");
  }
  return key;
}

function encryptToken(token, env) {
  const value = String(token || "").trim();
  if (value.length < 20) throw new Error("meta_page_token_invalid");

  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    tokenEncryptionKey(env),
    iv,
    { authTagLength: GCM_AUTH_TAG_BYTES }
  );
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64url"),
    iv: iv.toString("base64url"),
    tag: tag.toString("base64url")
  };
}

function decryptToken(record, env) {
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      tokenEncryptionKey(env),
      Buffer.from(record.token_iv, "base64url"),
      { authTagLength: GCM_AUTH_TAG_BYTES }
    );
    decipher.setAuthTag(Buffer.from(record.token_tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(record.token_ciphertext, "base64url")),
      decipher.final()
    ]).toString("utf8");
  } catch (cause) {
    const error = configurationError("meta_page_token_decryption_failed");
    error.cause = cause;
    throw error;
  }
}

function normalizedTasks(tasks) {
  if (!Array.isArray(tasks)) return [];
  return [...new Set(tasks.map(value => String(value || "").trim()).filter(Boolean))];
}

export async function saveMetaPageConnection({
  pageId,
  pageName = "",
  pageToken,
  tasks = []
}, {
  env = process.env,
  queryImpl = query
} = {}) {
  const id = String(pageId || "").trim();
  if (!/^\d+$/.test(id)) throw new Error("meta_page_id_invalid");

  const encrypted = encryptToken(pageToken, env);
  const safeTasks = normalizedTasks(tasks);

  await queryImpl(
    `INSERT INTO meta_page_connections (
       page_id, page_name, token_ciphertext, token_iv, token_tag, tasks
     ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     ON CONFLICT (page_id) DO UPDATE SET
       page_name = EXCLUDED.page_name,
       token_ciphertext = EXCLUDED.token_ciphertext,
       token_iv = EXCLUDED.token_iv,
       token_tag = EXCLUDED.token_tag,
       tasks = EXCLUDED.tasks,
       updated_at = NOW()`,
    [
      id,
      String(pageName || "").trim(),
      encrypted.ciphertext,
      encrypted.iv,
      encrypted.tag,
      JSON.stringify(safeTasks)
    ]
  );

  return {
    pageId: id,
    pageName: String(pageName || "").trim(),
    tasks: safeTasks
  };
}

export async function loadMetaPageConnection(pageId, {
  env = process.env,
  queryImpl = query
} = {}) {
  const id = String(pageId || "").trim();
  if (!/^\d+$/.test(id)) return null;

  const result = await queryImpl(
    `SELECT page_id, page_name, token_ciphertext, token_iv, token_tag, tasks,
            connected_at, updated_at
       FROM meta_page_connections
      WHERE page_id = $1`,
    [id]
  );
  if (!result.rowCount) return null;

  const record = result.rows[0];
  return {
    pageId: record.page_id,
    pageName: record.page_name,
    pageToken: decryptToken(record, env),
    tasks: normalizedTasks(record.tasks),
    connectedAt: record.connected_at,
    updatedAt: record.updated_at
  };
}
