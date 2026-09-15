import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

function run(overrides = {}) {
  const env = {
    ...process.env,
    PUBLIC_LAUNCH_MODE: "waitlist",
    WAITLIST_ENABLED: "false",
    PAYMENT_PROVIDER: "mock",
    STRIPE_LIVE_MODE_ENABLED: "false",
    ESIM_PROVIDER: "mock",
    ESIM_WEBHOOKS_ENABLED: "false",
    ESIM_LIVE_ORDERS_ENABLED: "false",
    ATT_COMMERCIAL_CONTRACT_APPROVED: "false",
    ATT_LIVE_PROVISIONING_ENABLED: "false",
    ...overrides
  };

  return spawnSync(process.execPath, ["scripts/launch-readiness-check.js"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8"
  });
}

test("safe closed waitlist passes without enabling collection", () => {
  const result = run();
  assert.equal(result.status, 0);
  assert.match(result.stdout, /safe waitlist-only mode/i);
});

test("enabled waitlist passes with the dedicated Supabase storage configuration", () => {
  const result = run({ WAITLIST_ENABLED: "true" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /public waitlist can open/i);
  assert.match(result.stdout, /supabase/i);
});

test("production can use the waitlist default when the feature flag is not explicitly set", () => {
  const result = run({ WAITLIST_ENABLED: "", VERCEL_ENV: "production" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /public waitlist can open/i);
});

test("live commerce and provisioning stay blocked during waitlist launch regardless of case", () => {
  for (const unsafeFlag of [
    "STRIPE_LIVE_MODE_ENABLED",
    "ESIM_LIVE_ORDERS_ENABLED",
    "ATT_LIVE_PROVISIONING_ENABLED"
  ]) {
    for (const value of ["true", "TRUE"]) {
      const result = run({ [unsafeFlag]: value });
      assert.notEqual(result.status, 0, `${unsafeFlag}=${value} should fail`);
    }
  }
});

test("invalid boolean safety values fail instead of silently changing meaning", () => {
  const result = run({ ESIM_LIVE_ORDERS_ENABLED: "yes" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must be either true or false/i);
});

test("unsupported provider names fail readiness", () => {
  assert.notEqual(run({ PAYMENT_PROVIDER: "strpie" }).status, 0);
  assert.notEqual(run({ ESIM_PROVIDER: "esim_go" }).status, 0);
});
