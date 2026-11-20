// Cloudflare-specific public API. Node/Vercel server routes are intentionally
// not bundled into this Worker; unpublished customer APIs stay unavailable.
const WAITLIST_URL = "https://wzzreonjszvcldifoaod.supabase.co/functions/v1/streetwise-waitlist";
const CONSENT_VERSION = "2026-08-26";
const MAX_BODY_BYTES = 2048;
const MAX_CHAT_BODY_BYTES = 20_000;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const FREE_MODEL = "openrouter/free";
const JARVIS_INSTRUCTIONS = [
  "You are Jarvis, a helpful private assistant to the Streetwise Connection owner.",
  "Answer clearly and practically. Never claim you accessed files, used tools, changed settings, purchased items, or ran commands.",
  "You cannot control computers or access private systems. Do not ask for passwords, access tokens or other secrets.",
  "Streetwise cellular service is planned, not available for sale. Do not invent product prices or current facts."
].join(" ");

function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      ...extraHeaders
    }
  });
}

function closedStatus() {
  return {
    publicLaunchMode: "waitlist",
    serviceModel: "cellular-mvno",
    waitlist: {
      open: false,
      consentVersion: CONSENT_VERSION,
      storageConfigured: false,
      message: "The waitlist is temporarily unavailable. Please check back soon."
    }
  };
}

function validEmail(value) {
  return typeof value === "string" && value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function checkWaitlist() {
  try {
    const upstream = await fetch(WAITLIST_URL, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8000)
    });
    if (!upstream.ok) return json(503, closedStatus());
    const payload = await upstream.json();
    const status = payload?.waitlist;
    if (!status || status.open !== true ||
        status.consentVersion !== CONSENT_VERSION ||
        typeof status.supportEmail !== "string" || !status.supportEmail.includes("@")) {
      return json(503, closedStatus());
    }
    return json(200, {
      publicLaunchMode: "waitlist",
      serviceModel: "cellular-mvno",
      waitlist: {
        open: true,
        consentVersion: CONSENT_VERSION,
        storageConfigured: true,
        storageProvider: "supabase",
        supportEmail: status.supportEmail,
        message: "Join the waitlist for launch updates. No payment or activation is available."
      }
    });
  } catch {
    return json(503, closedStatus());
  }
}

async function joinWaitlist(request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return json(403, { error: "origin_not_allowed" });
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json(415, { error: "json_required" });
  }
  if (Number(request.headers.get("content-length") || 0) > MAX_BODY_BYTES) {
    return json(413, { error: "request_too_large" });
  }

  let payload;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
      return json(413, { error: "request_too_large" });
    }
    payload = JSON.parse(body);
  } catch {
    return json(400, { error: "invalid_json" });
  }
  const email = String(payload?.email ?? "").trim().toLowerCase();
  if (!validEmail(email)) return json(400, { error: "valid_email_required" });
  if (payload?.consentVersion !== CONSENT_VERSION) {
    return json(400, { error: "waitlist_consent_required" });
  }

  // The Supabase function applies an IP-hash rate limit and writes consent to
  // its existing table. Do not return success unless it confirms that write.
  const forwarded = {
    "content-type": "application/json",
    accept: "application/json"
  };
  const clientIp = request.headers.get("cf-connecting-ip");
  if (clientIp) forwarded["x-forwarded-for"] = clientIp;

  try {
    const upstream = await fetch(WAITLIST_URL, {
      method: "POST",
      headers: forwarded,
      body: JSON.stringify({ email, consentVersion: CONSENT_VERSION }),
      signal: AbortSignal.timeout(10000)
    });
    const result = await upstream.json().catch(() => ({}));
    if (upstream.status === 201 && result.joined === true) {
      return json(201, { joined: true, message: "You’re on the waitlist. We’ll email you when launch details are ready." });
    }
    if (upstream.status === 429) {
      const retry = upstream.headers.get("retry-after") || "900";
      return json(429, { error: "waitlist_rate_limited" }, /^\d{1,5}$/.test(retry) ? { "retry-after": retry } : {});
    }
    if (upstream.status === 400) {
      const allowed = ["valid_email_required", "waitlist_consent_required", "invalid_json"];
      return json(400, { error: allowed.includes(result.error) ? result.error : "invalid_request" });
    }
    return json(503, { error: "waitlist_storage_unavailable" });
  } catch {
    return json(503, { error: "waitlist_storage_unavailable" });
  }
}

async function sameSecret(supplied, expected) {
  if (supplied.length > 1024 || expected.length < 32) return false;
  // Compare fixed-length digests so an incorrect byte doesn't create a
  // distinguishable early-exit time. Neither the secret nor its digest is logged.
  const encode = new TextEncoder();
  const [a, b] = await Promise.all([supplied, expected].map(value =>
    crypto.subtle.digest("SHA-256", encode.encode(value))));
  const left = new Uint8Array(a);
  const right = new Uint8Array(b);
  let different = supplied.length === expected.length ? 0 : 1;
  for (let index = 0; index < left.length; index++) different |= left[index] ^ right[index];
  return different === 0;
}

function freeModel(env) {
  const model = String(env?.JARVIS_AI_MODEL || FREE_MODEL).trim();
  return model === FREE_MODEL || /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._:-]+:free$/.test(model) ? model : null;
}

function cleanMessages(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 20 || value.length % 2 !== 1) return null;
  let total = 0;
  const messages = [];
  for (let index = 0; index < value.length; index++) {
    const role = index % 2 === 0 ? "user" : "assistant";
    const content = value[index]?.content;
    if (value[index]?.role !== role || typeof content !== "string" ||
        !content.trim() || content.length > 4000) return null;
    total += content.length;
    if (total > 16_000) return null;
    messages.push({ role, content: content.trim() });
  }
  return messages;
}

async function jarvisChat(request, env) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json(403, { error: "origin_not_allowed" });
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json(415, { error: "json_required" });
  }
  if (Number(request.headers.get("content-length") || 0) > MAX_CHAT_BODY_BYTES) {
    return json(413, { error: "request_too_large" });
  }

  let data;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_CHAT_BODY_BYTES) {
      return json(413, { error: "request_too_large" });
    }
    data = JSON.parse(body);
  } catch {
    return json(400, { error: "invalid_json" });
  }
  const messages = cleanMessages(data?.messages);
  if (!messages) return json(400, { error: "jarvis_invalid_messages" });

  const latest = messages.at(-1).content;
  if (/^(\/status|streetwise status|check streetwise status|jarvis online)$/i.test(latest)) {
    const probe = /^jarvis online$/i.test(latest);
    return json(200, {
      ok: true,
      reply: probe
        ? "JARVIS web connection is online. This is a local status reply, not an OpenRouter AI response. Free AI availability has not been verified."
        : "Streetwise Connection's website is live. Public launch mode: waitlist. Cellular service is not live.",
      source: "streetwise.status"
    });
  }

  const key = String(env?.OPENROUTER_API_KEY || "").trim();
  if (!key) return json(503, { error: "jarvis_ai_not_configured" });
  const model = freeModel(env);
  if (!model) return json(503, { error: "jarvis_free_model_required" });

  try {
    const upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: JARVIS_INSTRUCTIONS }, ...messages],
        max_completion_tokens: 1000,
        stream: false,
        provider: { max_price: { prompt: 0, completion: 0 } }
      })
    });
    if (!upstream.ok) {
      try { await upstream.body?.cancel(); } catch { /* Never log private upstream content. */ }
      if (upstream.status === 429) {
        const retry = upstream.headers.get("retry-after") || "";
        // Never retry automatically: failed free requests can consume daily quota.
        // Preserve a bounded numeric Retry-After, including a possible daily reset.
        const seconds = /^\d{1,6}$/.test(retry) ? Math.min(86400, Number(retry)) : null;
        return json(429, { error: "jarvis_provider_rate_limited" }, seconds === null ? {} : { "retry-after": String(seconds) });
      }
      if ([401, 403].includes(upstream.status)) return json(502, { error: "jarvis_provider_auth_failed" });
      if (upstream.status === 402) return json(502, { error: "jarvis_provider_billing_required" });
      return json(502, { error: "jarvis_provider_unavailable" });
    }
    const result = await upstream.json();
    const reply = result?.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim() || reply.length > 16_000) {
      return json(502, { error: "jarvis_provider_unavailable" });
    }
    return json(200, { ok: true, reply: reply.trim(), source: "ai" });
  } catch {
    return json(502, { error: "jarvis_provider_unavailable" });
  }
}

async function jarvisApi(request, env, path) {
  const expected = String(env?.JARVIS_ACCESS_TOKEN || "");
  if (expected.length < 32) return json(503, { error: "jarvis_access_not_configured" });
  const authorization = request.headers.get("authorization") || "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!await sameSecret(supplied, expected)) return json(401, { error: "jarvis_access_denied" });

  if (path === "/api/jarvis/status") {
    if (request.method !== "GET") return json(405, { error: "method_not_allowed" });
    return json(200, {
      ok: true,
      name: "Jarvis",
      aiConfigured: Boolean(String(env?.OPENROUTER_API_KEY || "").trim() && freeModel(env)),
      capabilities: ["streetwise.status"],
      computerControl: false,
      commandsAvailable: false
    });
  }
  if (path === "/api/jarvis/chat") {
    return request.method === "POST" ? jarvisChat(request, env) : json(405, { error: "method_not_allowed" });
  }
  if (path.startsWith("/api/jarvis/commands/")) return json(503, { error: "jarvis_commands_unavailable" });
  return json(404, { error: "not_found" });
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === "/api/public-status") {
      return request.method === "GET" ? checkWaitlist() : json(405, { error: "method_not_allowed" });
    }
    if (path === "/api/waitlist") {
      return request.method === "POST" ? joinWaitlist(request) : json(405, { error: "method_not_allowed" });
    }
    if (path.startsWith("/api/jarvis/")) return jarvisApi(request, env, path);
    if (path.startsWith("/api/")) return json(404, { error: "not_found" });
    return env.ASSETS.fetch(request);
  }
};
