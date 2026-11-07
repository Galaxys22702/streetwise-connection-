import { timingSafeEqual } from "node:crypto";
import { resolveJarvisProvider, requestJarvisReply } from "./jarvisProvider.js";
import {
  createJarvis, createToolRegistry, createPolicy, createAuditLog,
  createMemory, createStreetwiseStatusTool
} from "../../jarvis/src/index.js";

function problem(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}

export function authorizeJarvis(req, env = process.env) {
  if (env.JARVIS_ENABLED !== "true") throw problem("jarvis_disabled", 503);
  const expected = String(env.JARVIS_ACCESS_TOKEN || "");
  if (expected.length < 32) throw problem("jarvis_access_not_configured", 503);
  const header = String(req.headers.authorization || "");
  const supplied = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw problem("jarvis_access_denied", 401);
  }
}

export function jarvisStatus(env = process.env) {
  let aiConfigured = false;
  try { aiConfigured = Boolean(resolveJarvisProvider(env)); } catch { /* Invalid configuration is not ready. */ }
  return {
    ok: true,
    name: "Jarvis",
    aiConfigured,
    capabilities: ["streetwise.status"],
    computerControl: false
  };
}

function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 20) {
    throw problem("jarvis_invalid_messages", 400);
  }
  let total = 0;
  const clean = messages.map((message, index) => {
    const role = index % 2 === 0 ? "user" : "assistant";
    if (message?.role !== role || typeof message.content !== "string" ||
        !message.content.trim() || message.content.length > 4000) {
      throw problem("jarvis_invalid_messages", 400);
    }
    total += message.content.length;
    return { role, content: message.content.trim() };
  });
  if (clean.at(-1).role !== "user" || total > 16000) {
    throw problem("jarvis_invalid_messages", 400);
  }
  return clean;
}

export async function chatWithJarvis(body, { env = process.env, fetchImpl = fetch } = {}) {
  const messages = validateMessages(body?.messages);
  const last = messages.at(-1).content;
  if (/^(\/status|streetwise status|check streetwise status)$/i.test(last)) {
    const registry = createToolRegistry();
    registry.register(createStreetwiseStatusTool());
    const jarvis = createJarvis({
      registry,
      policy: createPolicy({ permissions: { "jarvis-owner": ["streetwise.status"] } }),
      audit: createAuditLog(),
      memory: createMemory()
    });
    const result = await jarvis.run({
      actorId: "jarvis-owner", capability: "streetwise.status", input: {},
      metadata: { environment: env.NODE_ENV === "production" ? "production" : "development" }
    });
    if (!result.ok) throw problem("jarvis_status_failed", 502);
    return {
      ok: true,
      reply: `Streetwise is ${result.result.ok ? "ready" : "not ready"}. Public mode: ${result.result.publicLaunchMode}.`,
      source: "streetwise.status",
      status: result.result
    };
  }

  const reply = await requestJarvisReply(messages, { env, fetchImpl,
    instructions: "You are Jarvis, the user's helpful assistant. Give clear, practical answers, including furniture selection, layout and assembly help. Ask for measurements, budget or model instructions when necessary. You can answer questions but cannot control computers, purchase items or perform physical actions. Never claim you performed an action. The user can send /status for a verified Streetwise status. Do not invent current prices, product availability, tool results or access to private files." });
  return { ok: true, reply, source: "ai" };
}
