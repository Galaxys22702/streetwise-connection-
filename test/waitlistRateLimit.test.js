import assert from "node:assert/strict";
import test from "node:test";
import {
  enforceWaitlistRateLimit,
  resetWaitlistRateLimitForTests
} from "../src/services/waitlistRateLimit.js";

function request(ip = "198.51.100.25") {
  return { headers: { "x-forwarded-for": ip }, socket: { remoteAddress: ip } };
}

test("limits repeated waitlist attempts from the same forwarded client", () => {
  resetWaitlistRateLimitForTests();
  const req = request();
  const now = Date.now();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.doesNotThrow(() => enforceWaitlistRateLimit(req, now + attempt));
  }
  assert.throws(
    () => enforceWaitlistRateLimit(req, now + 6),
    (error) => error.message === "waitlist_rate_limited" && error.statusCode === 429
  );
});

test("expired attempts are pruned after the rate-limit window", () => {
  resetWaitlistRateLimitForTests();
  const req = request();
  const now = Date.now();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    enforceWaitlistRateLimit(req, now + attempt);
  }

  assert.doesNotThrow(() => enforceWaitlistRateLimit(req, now + (16 * 60 * 1000)));
});
