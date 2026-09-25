import assert from "node:assert/strict";
import test from "node:test";
import { enforceRateLimit, resetRateLimitsForTests } from "../src/services/requestRateLimit.js";

function request({ remote = "203.0.113.10", forwarded = "" } = {}) {
  return {
    headers: forwarded ? { "x-forwarded-for": forwarded } : {},
    socket: { remoteAddress: remote }
  };
}

test("limits requests independently by scope", () => {
  resetRateLimitsForTests();
  const req = request();
  const now = Date.now();

  enforceRateLimit(req, { scope: "auth_login", maxAttempts: 1, now });
  assert.throws(
    () => enforceRateLimit(req, { scope: "auth_login", maxAttempts: 1, now: now + 1 }),
    (error) => error.message === "auth_login_rate_limited" && error.statusCode === 429
  );
  assert.doesNotThrow(() =>
    enforceRateLimit(req, { scope: "auth_register", maxAttempts: 1, now: now + 1 })
  );
});

test("does not trust spoofable forwarded-for outside Vercel", () => {
  resetRateLimitsForTests();
  const now = Date.now();

  enforceRateLimit(request({ forwarded: "198.51.100.1" }), {
    scope: "test",
    maxAttempts: 1,
    now,
    env: {}
  });

  assert.throws(() =>
    enforceRateLimit(request({ forwarded: "198.51.100.2" }), {
      scope: "test",
      maxAttempts: 1,
      now: now + 1,
      env: {}
    })
  );
});

test("uses Vercel forwarded client address behind the trusted platform proxy", () => {
  resetRateLimitsForTests();
  const now = Date.now();

  enforceRateLimit(request({ forwarded: "198.51.100.1" }), {
    scope: "test",
    maxAttempts: 1,
    now,
    env: { VERCEL: "1" }
  });

  assert.doesNotThrow(() =>
    enforceRateLimit(request({ forwarded: "198.51.100.2" }), {
      scope: "test",
      maxAttempts: 1,
      now: now + 1,
      env: { VERCEL: "1" }
    })
  );
});
