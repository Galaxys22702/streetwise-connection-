import assert from "node:assert/strict";
import test from "node:test";
import { createCheckout, paymentProviderStatus } from "../src/services/paymentService.js";

async function withPaymentProvider(value, work) {
  const previous = process.env.PAYMENT_PROVIDER;
  process.env.PAYMENT_PROVIDER = value;
  try {
    return await work();
  } finally {
    if (previous === undefined) delete process.env.PAYMENT_PROVIDER;
    else process.env.PAYMENT_PROVIDER = previous;
  }
}

test("mock checkout is available without payment credentials", async () => {
  await withPaymentProvider("mock", async () => {
    const checkout = await createCheckout(
      { id: "test-user-002", email: "checkout@streetwise.example" },
      { planId: "residential-home-25" }
    );

    assert.equal(paymentProviderStatus().provider, "mock");
    assert.equal(checkout.provider, "mock");
    assert.equal(checkout.livemode, false);
    assert.equal(checkout.planId, "residential-home-25");
  });
});

test("checkout rejects an unknown plan", async () => {
  await withPaymentProvider("mock", async () => {
    await assert.rejects(
      createCheckout({ id: "test-user-003", email: "invalid@streetwise.example" }, { planId: "nope" }),
      (error) => error.message === "purchasable_plan_required" && error.statusCode === 400
    );
  });
});

test("unsupported payment provider fails instead of silently becoming mock", async () => {
  await withPaymentProvider("strpie", async () => {
    assert.throws(
      () => paymentProviderStatus(),
      (error) => error.message === "unsupported_payment_provider" && error.statusCode === 500
    );
    await assert.rejects(
      createCheckout(
        { id: "test-user-004", email: "misconfigured@streetwise.example" },
        { planId: "residential-home-25" }
      ),
      (error) => error.message === "unsupported_payment_provider" && error.statusCode === 500
    );
  });
});

test("live Stripe checkout is blocked while the selected plan is still planned", async () => {
  const previousKey = process.env.STRIPE_SECRET_KEY;
  const previousLive = process.env.STRIPE_LIVE_MODE_ENABLED;
  try {
    process.env.STRIPE_SECRET_KEY = "sk_live_example";
    process.env.STRIPE_LIVE_MODE_ENABLED = "true";
    await withPaymentProvider("stripe", async () => {
      await assert.rejects(
        createCheckout(
          { id: "test-user-005", email: "live@streetwise.example" },
          { planId: "residential-home-25" }
        ),
        (error) => error.message === "plan_not_sellable" && error.statusCode === 409
      );
    });
  } finally {
    if (previousKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousKey;
    if (previousLive === undefined) delete process.env.STRIPE_LIVE_MODE_ENABLED;
    else process.env.STRIPE_LIVE_MODE_ENABLED = previousLive;
  }
});
