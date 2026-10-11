const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const MAX_TRACKED_CLIENTS = 10_000;
const buckets = new Map();

function clientKey(req, env = process.env) {
  const remote = String(req.socket?.remoteAddress || "unknown");
  if (env.VERCEL === "1") {
    const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    return forwarded || remote;
  }
  return remote;
}

function pruneExpired(now) {
  for (const [key, bucket] of buckets) {
    const active = bucket.attempts.filter((time) => now - time < bucket.windowMs);
    if (active.length) buckets.set(key, { ...bucket, attempts: active });
    else buckets.delete(key);
  }

  while (buckets.size > MAX_TRACKED_CLIENTS) {
    const oldestKey = buckets.keys().next().value;
    if (oldestKey === undefined) break;
    buckets.delete(oldestKey);
  }
}

export function enforceRateLimit(req, {
  scope,
  maxAttempts,
  windowMs = DEFAULT_WINDOW_MS,
  now = Date.now(),
  env = process.env
}) {
  pruneExpired(now);
  const key = `${scope}:${clientKey(req, env)}`;
  const bucket = buckets.get(key) || { attempts: [], windowMs };
  const attempts = bucket.attempts;

  if (attempts.length >= maxAttempts) {
    const error = new Error(`${scope}_rate_limited`);
    error.statusCode = 429;
    error.retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - attempts[0])) / 1000));
    throw error;
  }

  attempts.push(now);
  buckets.delete(key);
  buckets.set(key, { attempts, windowMs });
}

export function resetRateLimitsForTests() {
  buckets.clear();
}
