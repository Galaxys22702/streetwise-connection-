import assert from "node:assert/strict";
import test from "node:test";
import { isCustomerServicePath } from "../src/config/launchMode.js";

test("identifies customer purchase and account routes for waitlist blocking", () => {
  assert.equal(isCustomerServicePath("/api/auth/register"), true);
  assert.equal(isCustomerServicePath("/api/payments/checkout"), true);
  assert.equal(isCustomerServicePath("/api/esims/order"), true);
  assert.equal(isCustomerServicePath("/api/coverage/check"), true);
  assert.equal(isCustomerServicePath("/api/waitlist"), false);
  assert.equal(isCustomerServicePath("/api/providers/esim-go/webhook"), false);
});
