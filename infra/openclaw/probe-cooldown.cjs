'use strict';
// Pure, bounded cooldown policy for issue #166. No provider calls, persistence or credentials.
const MIN_MS = 60_000;
const MAX_MS = 24 * 60 * 60 * 1000;
function retryAfterMs(header, now = Date.now()) {
  if (typeof header !== 'string' || !header.trim()) return null;
  const value = header.trim();
  if (/^\d{1,8}$/.test(value)) return Math.min(MAX_MS, Math.max(MIN_MS, Number(value) * 1000));
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return Math.min(MAX_MS, Math.max(MIN_MS, timestamp - now));
}
function readRateLimit(error) {
  if (!error || typeof error !== 'object') return null;
  const status = error.status ?? error.statusCode ?? error.response?.status;
  if (status !== 429 && status !== '429') return null;
  const headers = error.response?.headers ?? error.headers;
  const value = typeof headers?.get === 'function'
    ? headers.get('retry-after')
    : headers?.['retry-after'] ?? headers?.['Retry-After'];
  return { retryAfter: typeof value === 'string' ? value : null };
}
function createProbeCooldown({ now = Date.now, defaultMs = 15 * 60_000 } = {}) {
  let until = 0;
  let inFlight = false;
  return {
    allowed() { return now() >= until; },
    remainingMs() { return Math.max(0, until - now()); },
    rateLimited(retryAfter) {
      const requested = retryAfterMs(retryAfter, now()) ?? defaultMs;
      until = Math.max(until, now() + Math.min(MAX_MS, Math.max(MIN_MS, requested)));
      return this.remainingMs();
    },
    async runIfAllowed(request) {
      if (typeof request !== 'function') throw new TypeError('request must be a function');
      if (!this.allowed()) return { skipped: true, reason: 'cooldown', retryAfterMs: this.remainingMs() };
      if (inFlight) return { skipped: true, reason: 'in_flight' };
      inFlight = true;
      try { return { skipped: false, result: await request() }; }
      catch (error) {
        const limited = readRateLimit(error);
        if (limited) this.rateLimited(limited.retryAfter);
        throw error;
      }
      finally { inFlight = false; }
    },
    reset() { until = 0; }
  };
}
module.exports = { retryAfterMs, readRateLimit, createProbeCooldown };
