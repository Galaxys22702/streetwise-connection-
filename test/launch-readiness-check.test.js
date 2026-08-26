import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

function run(overrides = {}) {
  const env = {
    ...process.env,
    PUBLIC_LAUNCH_MODE: "waitlist",
    WAITLIST_ENABLED: "false",
    STRIPE_LIVE_MODE_ENABLED: "false",
    ESIM_LIVE_ORDERS_ENABLED: "false",
    DATABASE_URL: "",
    SUPPORT_EMAIL: "",
    ...overrides
  };

  return spawnSync(process.execPath, ["scripts/launch-readiness-check.js"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8"
  });
}

test("safe closed waitlist passes without production storage", () => {
  const result = run();
  assert.equal(result.status, 0);
  assert.match(result.stdout, /safe waitlist-only mode/i);
});

test("open waitlist requires durable database storage", () => {
  const result = run({ WAITLIST_ENABLED: "true", SUPPORT_EMAIL: "support@example.com" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /waitlist_requires_database_url/);
});

test("open waitlist requires a valid support contact", () => {
  const result = run({ WAITLIST_ENABLED: "true", DATABASE_URL: "postgres://example.invalid/db" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /waitlist_requires_valid_support_email/);
});

test("open waitlist passes configuration checks with storage and support contact", () => {
  const result = run({
    WAITLIST_ENABLED: "true",
    DATABASE_URL: "postgres://example.invalid/db",
    SUPPORT_EMAIL: "support@example.com"
  });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /waitlist can open/i);
});

test("live commerce stays blocked during waitlist launch", () => {
  for (const unsafeFlag of ["STRIPE_LIVE_MODE_ENABLED", "ESIM_LIVE_ORDERS_ENABLED"]) {
    const result = run({ [unsafeFlag]: "true" });
    assert.notEqual(result.status, 0);
  }
});
