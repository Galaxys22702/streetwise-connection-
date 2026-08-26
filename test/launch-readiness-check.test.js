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

test("live commerce stays blocked during waitlist launch", () => {
  for (const unsafeFlag of ["STRIPE_LIVE_MODE_ENABLED", "ESIM_LIVE_ORDERS_ENABLED"]) {
    const result = run({ [unsafeFlag]: "true" });
    assert.notEqual(result.status, 0);
  }
});
