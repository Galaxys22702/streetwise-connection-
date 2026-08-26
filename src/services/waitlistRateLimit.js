const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attemptsByClient = new Map();

function clientKey(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket?.remoteAddress || "unknown";
}

export function enforceWaitlistRateLimit(req, now = Date.now()) {
  const key = clientKey(req);
  const attempts = (attemptsByClient.get(key) || []).filter((time) => now - time < WINDOW_MS);

  if (attempts.length >= MAX_ATTEMPTS) {
    const error = new Error("waitlist_rate_limited");
    error.statusCode = 429;
    error.retryAfterSeconds = Math.ceil((WINDOW_MS - (now - attempts[0])) / 1000);
    throw error;
  }

  attempts.push(now);
  attemptsByClient.set(key, attempts);
}
