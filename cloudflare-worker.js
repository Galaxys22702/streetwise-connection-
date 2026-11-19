// Cloudflare-specific public API. Node/Vercel server routes are intentionally
// not bundled into this Worker; unpublished customer APIs stay unavailable.
const WAITLIST_URL = "https://wzzreonjszvcldifoaod.supabase.co/functions/v1/streetwise-waitlist";
const CONSENT_VERSION = "2026-08-26";
const MAX_BODY_BYTES = 2048;

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

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === "/api/public-status") {
      return request.method === "GET" ? checkWaitlist() : json(405, { error: "method_not_allowed" });
    }
    if (path === "/api/waitlist") {
      return request.method === "POST" ? joinWaitlist(request) : json(405, { error: "method_not_allowed" });
    }
    if (path.startsWith("/api/jarvis/")) return json(503, { error: "jarvis_disabled" });
    if (path.startsWith("/api/")) return json(404, { error: "not_found" });
    return env.ASSETS.fetch(request);
  }
};
