import test from "node:test";
import assert from "node:assert/strict";
import { retryAfterSeconds, isLocalStatusPrompt } from "../public/jarvis-rate-limit.js";

test("rate limit cooldown preserves reset hints up to a day and never retries immediately", () => {
  assert.equal(retryAfterSeconds(""), 60);
  assert.equal(retryAfterSeconds("1"), 60);
  assert.equal(retryAfterSeconds("120"), 120);
  assert.equal(retryAfterSeconds("86400"), 86400);
  assert.equal(retryAfterSeconds("999999"), 86400);
  assert.equal(retryAfterSeconds("bogus"), 60);
  const now = Date.parse("2026-11-19T00:00:00Z");
  assert.equal(retryAfterSeconds("Thu, 19 Nov 2026 00:03:00 GMT", now), 180);
});

test("only clear local status requests bypass the AI quota cooldown", () => {
  assert.equal(isLocalStatusPrompt("JARVIS ONLINE"), true);
  assert.equal(isLocalStatusPrompt(" /status "), true);
  assert.equal(isLocalStatusPrompt("Help me with a new task"), false);
});
