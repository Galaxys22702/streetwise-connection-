import assert from "node:assert/strict";
import test from "node:test";
import { createCheckout, paymentProviderStatus } from "../src/services/paymentService.js";

test("mock checkout is available without payment credentials", async () => {
  process.env.PAYMENT_PROVIDER = "mock";
  const checkout = await createCheckout(
    { id: "test-user-002", email: "checkout@streetwise.example" },
    { planId: "residential-home-25" }
  );

  assert.equal(paymentProviderStatus().provider, "mock");
  assert.equal(checkout.provider, "mock");
  assert.equal(checkout.livemode, false);
  assert.equal(checkout.planId, "residential-home-25");
});

test("checkout rejects an unknown plan", async () => {
  await assert.rejects(
    createCheckout({ id: "test-user-003", email: "invalid@streetwise.example" }, { planId: "nope" }),
    (error) => error.message === "purchasable_plan_required" && error.statusCode === 400
  );
});
