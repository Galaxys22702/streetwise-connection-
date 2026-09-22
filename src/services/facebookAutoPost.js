const DEFAULT_BASE_URL = "https://streetwise-connection.vercel.app";
const DEFAULT_MINIMUM_GAP_MS = 25 * 60 * 1000;
const HALF_HOUR_MS = 30 * 60 * 1000;

export const STREETWISE_AUTO_POST_MESSAGES = [
  "Streetwise Connection. Built for the Streets. Connected to the World. Public waitlist open: https://streetwise-connection.vercel.app/",
  "Stay Wired. Stay Wise. Streetwise Connection is building affordable, security-focused connectivity. Join the public waitlist: https://streetwise-connection.vercel.app/",
  "Move Smart. Stay Connected. Streetwise Connection is preparing for launch. Follow the build and join the public waitlist: https://streetwise-connection.vercel.app/",
  "Signal Strong. Game Strong. Streetwise Connection is building the next stage of affordable connectivity. Public waitlist: https://streetwise-connection.vercel.app/",
  "Every Move Connected. Streetwise Connection is growing from Las Vegas outward. Join the public waitlist: https://streetwise-connection.vercel.app/",
  "From the Block to the World. Streetwise Connection is building with security, simplicity and affordability in mind. Waitlist: https://streetwise-connection.vercel.app/",
  "No fake promises. Clear terms, controlled activation and security first. That is the Streetwise Connection build. Public waitlist: https://streetwise-connection.vercel.app/no-fake-promises.html",
  "Street Smart. Signal Strong. Follow Streetwise Connection as the service takes shape. Public waitlist: https://streetwise-connection.vercel.app/",
  "Connected by Hustle. Built with a security-first approach. Streetwise Connection public waitlist: https://streetwise-connection.vercel.app/security-first.html",
  "The streets never lose signal. Streetwise Connection is preparing an affordable connectivity service with a public waitlist open now: https://streetwise-connection.vercel.app/",
  "Stay Connected. Stay Streetwise. Track the Streetwise Connection build and join the public waitlist: https://streetwise-connection.vercel.app/",
  "Streetwise Connection is being built in public, one verified step at a time. Join the waitlist: https://streetwise-connection.vercel.app/",
  "Security first, hype last. See how Streetwise Connection is approaching the build: https://streetwise-connection.vercel.app/security-first.html",
  "Clear terms matter. Streetwise Connection is documenting the service before launch, not after. Read more: https://streetwise-connection.vercel.app/clear-terms.html",
  "Controlled activation beats reckless rollout. Streetwise Connection is preparing deliberately: https://streetwise-connection.vercel.app/controlled-activation.html",
  "Affordable connectivity should still be built carefully. Follow Streetwise Connection and join the waitlist: https://streetwise-connection.vercel.app/",
  "Las Vegas roots. Wider ambitions. Streetwise Connection is building from the ground up. Public waitlist: https://streetwise-connection.vercel.app/",
  "One build. One standard: verify first, enable later. Streetwise Connection public waitlist: https://streetwise-connection.vercel.app/",
  "Streetwise Connection is keeping checkout off while provider and launch gates are verified. Follow the build: https://streetwise-connection.vercel.app/",
  "Public waitlist first. Commercial activation only when the pieces are ready. Streetwise Connection: https://streetwise-connection.vercel.app/",
  "Simple idea, disciplined execution. Streetwise Connection is working toward affordable eSIM connectivity. Waitlist: https://streetwise-connection.vercel.app/",
  "eSIM-first. Security-conscious. Still pre-launch. Track Streetwise Connection here: https://streetwise-connection.vercel.app/",
  "Streetwise Connection is building a cleaner path to mobile data without pretending unfinished work is finished. Waitlist: https://streetwise-connection.vercel.app/",
  "From code to connectivity, Streetwise Connection is documenting what works before turning it on. Follow the build: https://streetwise-connection.vercel.app/",
  "Built for real people, not marketing slides. Streetwise Connection is preparing its public launch path. Waitlist: https://streetwise-connection.vercel.app/",
  "Streetwise Connection is testing the boring stuff too: security, migrations, health checks and provider gates. Public waitlist: https://streetwise-connection.vercel.app/",
  "Good connectivity starts with boring reliability. Streetwise Connection is building for that. Join the waitlist: https://streetwise-connection.vercel.app/",
  "Streetwise Connection keeps launch claims behind verified gates. No fake promises: https://streetwise-connection.vercel.app/no-fake-promises.html",
  "Know what you are signing up for. Streetwise Connection is putting clear terms ahead of launch: https://streetwise-connection.vercel.app/clear-terms.html",
  "Activation should be controlled, auditable and deliberate. That is the Streetwise Connection approach: https://streetwise-connection.vercel.app/controlled-activation.html",
  "Security is part of the product, not a footer. Streetwise Connection: https://streetwise-connection.vercel.app/security-first.html",
  "Streetwise Connection is building an eSIM-first service with a public waitlist while commercial checks continue: https://streetwise-connection.vercel.app/",
  "Follow the build, not the hype. Streetwise Connection public waitlist: https://streetwise-connection.vercel.app/",
  "Streetwise Connection is keeping sales disabled until provider and launch requirements are verified. Waitlist: https://streetwise-connection.vercel.app/",
  "Street Smart. Build Smart. Streetwise Connection is validating the foundation before opening sales: https://streetwise-connection.vercel.app/",
  "Every Move Connected starts with getting the infrastructure right. Streetwise Connection waitlist: https://streetwise-connection.vercel.app/",
  "Affordable does not have to mean careless. Streetwise Connection is building security and operational checks into the foundation: https://streetwise-connection.vercel.app/",
  "Streetwise Connection is pre-launch, public about the work, and focused on getting the fundamentals right: https://streetwise-connection.vercel.app/",
  "Built in Las Vegas. Built with discipline. Streetwise Connection public waitlist: https://streetwise-connection.vercel.app/",
  "Provider checks, secure tokens, guarded writes, controlled activation. Streetwise Connection is building the plumbing before the promotion: https://streetwise-connection.vercel.app/",
  "Streetwise Connection is designed to fail closed when something is not ready. That is a feature, not a delay. Waitlist: https://streetwise-connection.vercel.app/",
  "Stay Wired. Stay Wise. The Streetwise Connection build remains public and pre-launch: https://streetwise-connection.vercel.app/",
  "From the Block to the World starts with a reliable foundation. Follow Streetwise Connection: https://streetwise-connection.vercel.app/",
  "Streetwise Connection is working toward simple, affordable eSIM connectivity with security built into the operating model: https://streetwise-connection.vercel.app/",
  "No Dead Zones. No Weak Moves. For now, the move is building it correctly. Streetwise Connection waitlist: https://streetwise-connection.vercel.app/",
  "Signal Strong. Process Strong. Streetwise Connection is validating each launch gate before enabling sales: https://streetwise-connection.vercel.app/",
  "Streetwise Connection is not selling a finished story before the system is ready. Follow the documented build: https://streetwise-connection.vercel.app/",
  "One day of half-hour posts, forty-eight different messages, one consistent point: Streetwise Connection is being built carefully. Waitlist: https://streetwise-connection.vercel.app/"
];

function normalizedBaseUrl(value) {
  const url = new URL(String(value || DEFAULT_BASE_URL).trim());
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("facebook_auto_post_base_url_must_use_https");
  }
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url;
}

function safeImageUrl(value, root) {
  const url = value
    ? new URL(String(value).trim())
    : new URL("/streetwise-mark.png", root);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("facebook_auto_post_image_url_must_use_http_or_https");
  }
  if (url.username || url.password) {
    throw new Error("facebook_auto_post_image_url_must_not_contain_credentials");
  }
  return url.toString();
}

async function requestJson(url, {
  adminKey,
  fetchImpl,
  method = "GET",
  body
}) {
  let response;
  try {
    response = await fetchImpl(url, {
      method,
      headers: {
        accept: "application/json",
        "x-streetwise-admin-key": adminKey,
        ...(body ? { "content-type": "application/json" } : {})
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15_000)
    });
  } catch (cause) {
    const error = new Error("facebook_auto_post_unreachable");
    error.cause = cause;
    throw error;
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("facebook_auto_post_invalid_response");
  }

  if (!response.ok) {
    const code = String(data?.error || "facebook_auto_post_request_failed");
    const error = new Error(code);
    error.statusCode = response.status;
    throw error;
  }
  return data;
}

function latestPublishedPost(payload) {
  const data = payload?.posts?.data;
  return Array.isArray(data) && data.length ? data[0] : null;
}

function ageMs(createdTime, nowMs) {
  const timestamp = Date.parse(String(createdTime || ""));
  if (!Number.isFinite(timestamp)) return Number.POSITIVE_INFINITY;
  return Math.max(0, nowMs - timestamp);
}

export async function runFacebookAutoPost({
  baseUrl = DEFAULT_BASE_URL,
  adminKey = "",
  enabled = true,
  imageUrl,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  minimumGapMs = DEFAULT_MINIMUM_GAP_MS,
  messages = STREETWISE_AUTO_POST_MESSAGES
} = {}) {
  if (!enabled) return { state: "disabled" };
  if (typeof fetchImpl !== "function") throw new Error("fetch_implementation_required");
  if (!Array.isArray(messages) || !messages.length) throw new Error("facebook_auto_post_messages_required");

  const key = String(adminKey || "").trim();
  if (key.length < 32) {
    return { state: "dormant", reason: "admin_key_not_configured" };
  }

  const root = normalizedBaseUrl(baseUrl);
  const status = await requestJson(new URL("/api/admin/facebook/status", root), {
    adminKey: key,
    fetchImpl
  });

  if (!status?.enabled || !status?.writesEnabled || !status?.pageIdConfigured || !status?.tokenConfigured) {
    return {
      state: "awaiting_meta_write_authorization",
      status: {
        enabled: Boolean(status?.enabled),
        writesEnabled: Boolean(status?.writesEnabled),
        pageIdConfigured: Boolean(status?.pageIdConfigured),
        tokenConfigured: Boolean(status?.tokenConfigured)
      }
    };
  }

  const currentMs = Number(now());
  if (!Number.isFinite(currentMs)) throw new Error("facebook_auto_post_now_invalid");

  const postsUrl = new URL("/api/admin/facebook/posts?limit=1", root);
  const recent = await requestJson(postsUrl, { adminKey: key, fetchImpl });
  const latest = latestPublishedPost(recent);
  const latestAge = ageMs(latest?.created_time, currentMs);

  if (latest && latestAge < minimumGapMs) {
    return {
      state: "skipped_recent_post",
      latestPostId: String(latest.id || ""),
      latestPostAgeMs: latestAge
    };
  }

  const slot = Math.floor(currentMs / HALF_HOUR_MS);
  const messageIndex = ((slot % messages.length) + messages.length) % messages.length;
  const selectedImageUrl = safeImageUrl(imageUrl, root);

  const created = await requestJson(new URL("/api/admin/facebook/posts", root), {
    adminKey: key,
    fetchImpl,
    method: "POST",
    body: {
      message: String(messages[messageIndex]),
      imageUrl: selectedImageUrl
    }
  });

  return {
    state: "posted",
    postId: String(created?.post?.id || ""),
    messageIndex,
    imageUrl: selectedImageUrl
  };
}
