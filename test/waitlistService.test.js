import assert from "node:assert/strict";
import test from "node:test";
import { joinWaitlist, waitlistStatus } from "../src/services/waitlistService.js";

function saveEnv(names) {
  return Object.fromEntries(names.map((name) => [name, process.env[name]]));
}

function restoreEnv(saved) {
  for (const [name, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

test("waitlist stays closed when WAITLIST_ENABLED is false", async () => {
  const saved = saveEnv(["PUBLIC_LAUNCH_MODE", "WAITLIST_ENABLED"]);
  const originalFetch = global.fetch;
  let fetchCalls = 0;

  process.env.PUBLIC_LAUNCH_MODE = "waitlist";
  process.env.WAITLIST_ENABLED = "false";
  global.fetch = async () => {
    fetchCalls += 1;
    throw new Error("backend_should_not_be_called");
  };

  try {
    assert.equal(waitlistStatus().open, false);
    await assert.rejects(
      () => joinWaitlist({ email: "person@example.com", consentVersion: "2026-08-26" }),
      (error) => error.message === "waitlist_not_open" && error.statusCode === 503
    );
    assert.equal(fetchCalls, 0);
  } finally {
    global.fetch = originalFetch;
    restoreEnv(saved);
  }
});

test("waitlist opens only when waitlist launch mode and feature flag are enabled", () => {
  const saved = saveEnv(["PUBLIC_LAUNCH_MODE", "WAITLIST_ENABLED"]);

  try {
    process.env.PUBLIC_LAUNCH_MODE = "waitlist";
    process.env.WAITLIST_ENABLED = "true";
    assert.equal(waitlistStatus().open, true);

    process.env.PUBLIC_LAUNCH_MODE = "commercial";
    assert.equal(waitlistStatus().open, false);
  } finally {
    restoreEnv(saved);
  }
});
