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
  "No fake promises. Clear terms, controlled activation and security first. That is the Streetwise Connection build. Public waitlist: https://streetwise-connection.vercel.app/",
  "Street Smart. Signal Strong. Follow Streetwise Connection as the network service takes shape. Public waitlist: https://streetwise-connection.vercel.app/",
  "Connected by Hustle. Built with a security-first approach. Streetwise Connection public waitlist: https://streetwise-connection.vercel.app/",
  "The streets never lose signal. Streetwise Connection is preparing an affordable connectivity service with a public waitlist open now: https://streetwise-connection.vercel.app/",
  "Stay Connected. Stay Streetwise. Track the build and join the public waitlist: https://streetwise-connection.vercel.app/",
  "Streetwise Connection is being built in public, one verified step at a time. Join the waitlist: https://streetwise-connection.vercel.app/"
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
