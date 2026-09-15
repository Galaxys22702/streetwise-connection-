import assert from "node:assert/strict";
import test from "node:test";
import {
  isCustomerServicePath,
  resolvePublicLaunchMode
} from "../src/config/launchMode.js";

test("public launch mode fails closed unless internal mode is explicit", () => {
  assert.equal(resolvePublicLaunchMode(undefined), "waitlist");
  assert.equal(resolvePublicLaunchMode("waitlist"), "waitlist");
  assert.equal(resolvePublicLaunchMode("WAITLIST"), "waitlist");
  assert.equal(resolvePublicLaunchMode("waitlst"), "waitlist");
  assert.equal(resolvePublicLaunchMode("live"), "waitlist");
  assert.equal(resolvePublicLaunchMode("internal"), "internal");
});

test("identifies customer purchase and account routes for waitlist blocking", () => {
  assert.equal(isCustomerServicePath("/api/auth/register"), true);
  assert.equal(isCustomerServicePath("/api/payments/checkout"), true);
  assert.equal(isCustomerServicePath("/api/esims/order"), true);
  assert.equal(isCustomerServicePath("/api/coverage/check"), true);
  assert.equal(isCustomerServicePath("/api/provider/catalogue"), true);
  assert.equal(isCustomerServicePath("/api/waitlist"), false);
  assert.equal(isCustomerServicePath("/api/providers/esim-go/webhook"), false);
});
