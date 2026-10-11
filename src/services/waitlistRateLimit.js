import { enforceRateLimit, resetRateLimitsForTests } from "./requestRateLimit.js";

export function enforceWaitlistRateLimit(req, now = Date.now()) {
  return enforceRateLimit(req, {
    scope: "waitlist",
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,
    now
  });
}

export function resetWaitlistRateLimitForTests() {
  resetRateLimitsForTests();
}
