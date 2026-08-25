import { promisify } from "node:util";
import { randomBytes, randomUUID, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { query } from "../db/index.js";

const scryptAsync = promisify(scrypt);
const SESSION_DAYS = Number(process.env.SESSION_DAYS || 30);

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, 64);
  return `scrypt$${salt}$${Buffer.from(derived).toString("hex")}`;
}

async function verifyPassword(password, stored) {
  const [scheme, salt, hex] = String(stored || "").split("$");
  if (scheme !== "scrypt" || !salt || !hex) return false;
  const derived = Buffer.from(await scryptAsync(password, salt, 64));
  const expected = Buffer.from(hex, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    createdAt: row.created_at
  };
}

async function createSession(userId) {
  const token = randomBytes(32).toString("base64url");
  const sessionId = `ses_${randomUUID().replaceAll("-", "")}`;
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [sessionId, userId, hashToken(token), expiresAt]
  );

  return { token, expiresAt };
}

export async function registerUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = String(password || "");

  if (!validateEmail(normalizedEmail)) {
    const error = new Error("valid_email_required");
    error.statusCode = 400;
    throw error;
  }
  if (normalizedPassword.length < 10) {
    const error = new Error("password_must_be_at_least_10_characters");
    error.statusCode = 400;
    throw error;
  }

  const userId = `usr_${randomUUID().replaceAll("-", "")}`;
  const passwordHash = await hashPassword(normalizedPassword);

  try {
    const result = await query(
      `INSERT INTO users (id, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, created_at`,
      [userId, normalizedEmail, passwordHash]
    );
    const session = await createSession(userId);
    return { user: publicUser(result.rows[0]), session };
  } catch (error) {
    if (error.code === "23505") {
      const conflict = new Error("email_already_registered");
      conflict.statusCode = 409;
      throw conflict;
    }
    throw error;
  }
}

export async function loginUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const result = await query(
    `SELECT id, email, password_hash, created_at
     FROM users WHERE LOWER(email) = $1 LIMIT 1`,
    [normalizedEmail]
  );

  const row = result.rows[0];
  if (!row || !(await verifyPassword(String(password || ""), row.password_hash))) {
    const error = new Error("invalid_email_or_password");
    error.statusCode = 401;
    throw error;
  }

  await query("DELETE FROM sessions WHERE expires_at <= NOW()");
  const session = await createSession(row.id);
  return { user: publicUser(row), session };
}

export async function authenticateRequest(req) {
  const auth = String(req.headers.authorization || "");
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const result = await query(
    `SELECT u.id, u.email, u.created_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()
     LIMIT 1`,
    [hashToken(match[1])]
  );

  return result.rows[0] ? publicUser(result.rows[0]) : null;
}

export async function logoutRequest(req) {
  const auth = String(req.headers.authorization || "");
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if (!match) return;
  await query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(match[1])]);
}
