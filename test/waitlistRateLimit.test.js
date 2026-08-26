import assert from "node:assert/strict";
import test from "node:test";
import { enforceWaitlistRateLimit } from "../src/services/waitlistRateLimit.js";

test("limits repeated waitlist attempts from the same forwarded client", () => {
  const request = { headers: { "x-forwarded-for": "198.51.100.25" }, socket: {} };
  const now = Date.now();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.doesNotThrow(() => enforceWaitlistRateLimit(request, now + attempt));
  }
  assert.throws(() => enforceWaitlistRateLimit(request, now + 6), /waitlist_rate_limited/);
});
