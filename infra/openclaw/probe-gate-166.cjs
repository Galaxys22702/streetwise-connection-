'use strict';
// Issue #166: in-memory, free-only guard for the pinned setup-inference probe.
// No network calls, persistence, filesystem access, credentials or paid fallback.
const FREE_MODELS = new Set(['free', 'openrouter/free', 'openrouter/openrouter/free']);
const MIN_MS = 60_000;
const MAX_MS = 24 * 60 * 60_000;
const DEFAULT_MS = 15 * 60_000;
function isFreeRoute(route) {
  return route?.provider === 'openrouter' &&
    typeof route?.model === 'string' && FREE_MODELS.has(route.model.trim());
}
function getRetryAfterHeader(error) {
  const sources = [error, error?.response, error?.cause, error?.cause?.response];
  for (const item of sources) {
    const headers = item?.headers;
    if (!headers) continue;
    if (typeof headers.get === 'function') {
      const value = headers.get('retry-after');
      if (typeof value === 'string') return value;
    } else if (typeof headers === 'object') {
      const key = Object.keys(headers).find(k => k.toLowerCase() === 'retry-after');
      if (key && typeof headers[key] === 'string') return headers[key];
    }
  }
  return null;
}
function boundMs(ms) {
  return Math.min(MAX_MS, Math.max(MIN_MS, ms));
}
function retryAfterMs(header, nowMs) {
  if (typeof header !== 'string' || !header.trim()) return null;
  const value = header.trim();
  if (/^\d{1,8}$/.test(value)) return boundMs(Number(value) * 1000);
  const dateMs = Date.parse(value);
  return Number.isFinite(dateMs) ? boundMs(dateMs - nowMs) : null;
}
function createProbeGuard({ now = Date.now } = {}) {
  let until = 0;
  let occupied = false;
  const active = new WeakSet();
  return {
    isFreeRoute,
    remainingMs: () => Math.max(0, until - now()),
    start(route) {
      if (!isFreeRoute(route)) return { controlled: false, allowed: true };
      if (now() < until) return { controlled: true, allowed: false, reason: 'cooldown' };
      if (occupied) return { controlled: true, allowed: false, reason: 'busy' };
      occupied = true;
      const ticket = { controlled: true, allowed: true };
      active.add(ticket);
      return ticket;
    },
    onRateLimit(error) {
      const ms = retryAfterMs(getRetryAfterHeader(error), now()) ?? DEFAULT_MS;
      until = Math.max(until, now() + boundMs(ms));
      return Math.max(0, until - now());
    },
    release(ticket) {
      if (ticket && active.has(ticket)) {
        active.delete(ticket);
        occupied = false;
      }
    }
  };
}
module.exports = { createProbeGuard, isFreeRoute, retryAfterMs };