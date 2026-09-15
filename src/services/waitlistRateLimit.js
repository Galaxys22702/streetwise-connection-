const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_TRACKED_CLIENTS = 10_000;
const attemptsByClient = new Map();

function clientKey(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket?.remoteAddress || "unknown";
}

function pruneExpired(now) {
  for (const [key, attempts] of attemptsByClient) {
    const active = attempts.filter((time) => now - time < WINDOW_MS);
    if (active.length) attemptsByClient.set(key, active);
    else attemptsByClient.delete(key);
  }

  while (attemptsByClient.size > MAX_TRACKED_CLIENTS) {
    const oldestKey = attemptsByClient.keys().next().value;
    if (oldestKey === undefined) break;
    attemptsByClient.delete(oldestKey);
  }
}

export function enforceWaitlistRateLimit(req, now = Date.now()) {
  pruneExpired(now);
  const key = clientKey(req);
  const attempts = attemptsByClient.get(key) || [];

  if (attempts.length >= MAX_ATTEMPTS) {
    const error = new Error("waitlist_rate_limited");
    error.statusCode = 429;
    error.retryAfterSeconds = Math.max(
      1,
      Math.ceil((WINDOW_MS - (now - attempts[0])) / 1000)
    );
    throw error;
  }

  attempts.push(now);
  // Reinsert to keep map iteration ordered by most recent client activity.
  attemptsByClient.delete(key);
  attemptsByClient.set(key, attempts);
}

export function resetWaitlistRateLimitForTests() {
  attemptsByClient.clear();
}
