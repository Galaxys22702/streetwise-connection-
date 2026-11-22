const DEFAULT_BASE_URL = "https://streetwise-connection.vercel.app";
const DEFAULT_MINIMUM_GAP_MS = 25 * 60 * 1000;
const HALF_HOUR_MS = 30 * 60 * 1000;

export const STREETWISE_AUTO_POST_MESSAGES = [
  "Streetwise Connection. Real Help. Right Here. Mobile setup help in Las Vegas, by appointment. Message @streetwiseconnection on Instagram to book: https://streetwise-connection.vercel.app/",
  "New phone, same you. Streetwise Connection Transfer + setup moves your photos, contacts and apps for $49 — on your phone, your carrier account. Book: https://streetwise-connection.vercel.app/book.html",
  "Quick phone setup, $29 flat. Updates, essential apps, accessibility settings and backup checks, handled in person by Streetwise Connection in Las Vegas: https://streetwise-connection.vercel.app/book.html",
  "Security setup, $69. Streetwise Connection locks down updates, screen lock, account protection and spam controls — and you keep every password and code to yourself: https://streetwise-connection.vercel.app/security-first.html",
  "eSIM installation help, $25. Streetwise Connection walks your carrier eSIM onto your phone, step by step, on your own account. By appointment in Las Vegas: https://streetwise-connection.vercel.app/book.html",
  "Street smart. Signal strong. Streetwise Connection does mobile setup help the right way — your phone, your carrier, your accounts, our guidance. Book: https://streetwise-connection.vercel.app/",
  "Clear prices, no surprises. Quick setup $29. Transfer + setup $49. Security setup $69. eSIM help $25. Streetwise Connection, Las Vegas: https://streetwise-connection.vercel.app/",
  "Your passwords stay yours. Streetwise Connection never asks for your passwords, PINs or verification codes — we guide, you tap. Mobile setup help: https://streetwise-connection.vercel.app/security-first.html",
  "By appointment, not by queue. Streetwise Connection gives your phone one-to-one attention in Las Vegas. Message @streetwiseconnection on Instagram to lock in: https://streetwise-connection.vercel.app/",
  "Got a new phone still sitting in the box? Streetwise Connection sets it up right — updates, apps, backups checked — for $29. Book your slot: https://streetwise-connection.vercel.app/book.html",
  "Switching phones should not mean losing photos. Streetwise Connection Transfer + setup, $49, moves your data with care on your own carrier account: https://streetwise-connection.vercel.app/book.html",
  "Scam texts and spam calls wearing you down? Streetwise Connection Security setup, $69, tightens the controls that keep them out: https://streetwise-connection.vercel.app/book.html",
  "Carrier eSIM QR code got you stuck? Streetwise Connection provides eSIM installation help for $25, guided on your existing carrier account: https://streetwise-connection.vercel.app/book.html",
  "Las Vegas local, independent and accountable. Streetwise Connection is mobile setup help from a real person, not a call centre. Book: https://streetwise-connection.vercel.app/",
  "Real Help. Right Here. Streetwise Connection helps with the phone you already own — setup, transfer, security, eSIM. By appointment: https://streetwise-connection.vercel.app/",
  "We do not sell plans and we do not activate service. Streetwise Connection is independent setup help on your own carrier account — and that is the point: https://streetwise-connection.vercel.app/clear-terms.html",
  "Cellular plans? Still launch targets, nothing more. Join the Streetwise Connection launch waitlist for updates — target opening January 1, 2027, tentative: https://streetwise-connection.vercel.app/",
  "The waitlist is for launch updates only. Streetwise Connection setup help, though, is booking today in Las Vegas — message @streetwiseconnection to start: https://streetwise-connection.vercel.app/",
  "No fake promises. Streetwise Connection setup help comes with clear terms, set prices and honest limits. Read them before you book: https://streetwise-connection.vercel.app/no-fake-promises.html",
  "Old phone to new phone, zero drama. Streetwise Connection Transfer + setup, $49 — data moved, basics checked, ready to roll: https://streetwise-connection.vercel.app/book.html",
  "Accessibility settings matter. Streetwise Connection Quick phone setup includes text size, contrast and the settings that make your phone yours — $29: https://streetwise-connection.vercel.app/book.html",
  "Backup checked before anything moves. That is the Streetwise Connection standard on every Transfer + setup appointment: https://streetwise-connection.vercel.app/book.html",
  "Two-factor on, screen lock strong, spam controls up. Streetwise Connection Security setup, $69, builds your defences in one sitting: https://streetwise-connection.vercel.app/security-first.html",
  "Travelling with an eSIM? Streetwise Connection helps install your carrier eSIM correctly before you fly — $25, by appointment: https://streetwise-connection.vercel.app/book.html",
  "From the block to the boardroom, your phone is your office. Streetwise Connection keeps it set up, secured and ready in Las Vegas: https://streetwise-connection.vercel.app/",
  "Parents, grandparents, first phones — Streetwise Connection sets up phones for real people, patiently and in person, from $25: https://streetwise-connection.vercel.app/book.html",
  "Price transparency is the flex. Streetwise Connection posts every setup price up front — no upsell pressure, no mystery fees: https://streetwise-connection.vercel.app/clear-terms.html",
  "Your carrier account stays in your hands. Streetwise Connection guides the taps; you keep control of the account, the passwords and the codes: https://streetwise-connection.vercel.app/security-first.html",
  "Booked, confirmed, handled. Streetwise Connection confirms the time and scope before any setup work begins — by appointment only: https://streetwise-connection.vercel.app/book.html",
  "Street Smart. Signal Strong. That is Streetwise Connection — mobile setup help built for Las Vegas, priced for real life: https://streetwise-connection.vercel.app/",
  "A new phone should feel like an upgrade, not homework. Streetwise Connection Quick phone setup, $29, gets you there in one appointment: https://streetwise-connection.vercel.app/book.html",
  "Photos, contacts, messages, apps — moved with a checklist, not crossed fingers. Streetwise Connection Transfer + setup, $49: https://streetwise-connection.vercel.app/book.html",
  "Account protection review, handled properly. Streetwise Connection Security setup checks recovery options and sign-in alerts — $69: https://streetwise-connection.vercel.app/security-first.html",
  "Dual SIM, travel SIM, carrier eSIM — if it scans, we can help you install it. Streetwise Connection eSIM installation help, $25: https://streetwise-connection.vercel.app/book.html",
  "Independent means our loyalty is to you, not a carrier. Streetwise Connection setup help works on your phone and your existing service: https://streetwise-connection.vercel.app/",
  "Vegas moves fast; your phone should keep up. Streetwise Connection setup, transfer, security and eSIM help — by appointment: https://streetwise-connection.vercel.app/",
  "Thinking about the future plans? Streetwise Connection launch targets are just that — targets. Join the waitlist for updates, tentative opening January 1, 2027: https://streetwise-connection.vercel.app/",
  "Today it is setup help done right. Tomorrow, launch updates for the waitlist. Streetwise Connection keeps the two separate and the terms clear: https://streetwise-connection.vercel.app/clear-terms.html",
  "Small business, big phone headaches? Streetwise Connection sets up work phones clean and secure, by appointment in Las Vegas: https://streetwise-connection.vercel.app/book.html",
  "Every appointment starts with listening. Streetwise Connection asks what you need from your phone, then sets it up that way: https://streetwise-connection.vercel.app/book.html",
  "No jargon, no judgement, no pressure. Streetwise Connection explains each step in plain language while your phone gets set up: https://streetwise-connection.vercel.app/",
  "Spam calls blocked, updates current, backups on. Streetwise Connection Security setup, $69 — one appointment, tighter phone: https://streetwise-connection.vercel.app/book.html",
  "Same carrier, same account, new phone — zero headache. Streetwise Connection Transfer + setup, $49, works with the service you already have: https://streetwise-connection.vercel.app/book.html",
  "Message @streetwiseconnection on Instagram with the service name, your phone model and your preferred day. Streetwise Connection confirms before anything is booked: https://streetwise-connection.vercel.app/book.html",
  "Real help does not hide behind a call queue. Streetwise Connection is Las Vegas mobile setup help, face to face, by appointment: https://streetwise-connection.vercel.app/",
  "Updates installed, essentials loaded, backups verified. Streetwise Connection Quick phone setup covers the fundamentals for $29: https://streetwise-connection.vercel.app/book.html",
  "Your phone holds your whole life — treat its security that way. Streetwise Connection Security setup, $69, by appointment in Las Vegas: https://streetwise-connection.vercel.app/security-first.html",
  "Different needs, same standard: clear prices, careful hands, your accounts under your control. Streetwise Connection — book setup help today: https://streetwise-connection.vercel.app/"
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
