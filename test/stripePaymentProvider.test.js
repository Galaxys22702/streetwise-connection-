import assert from "node:assert/strict";
import test from "node:test";
import {
  createStripeCheckoutSession,
  stripeStatus,
  verifyStripeWebhook
} from "../src/providers/stripePaymentProvider.js";

const names = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_LIVE_MODE_ENABLED",
  "APP_BASE_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_URL"
];

function saveEnv() {
  return Object.fromEntries(names.map((name) => [name, process.env[name]]));
}

function restoreEnv(saved) {
  for (const [name, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

test("Stripe status distinguishes invalid keys from configured test keys", () => {
  const saved = saveEnv();
  try {
    process.env.STRIPE_SECRET_KEY = "not-a-stripe-key";
    assert.equal(stripeStatus().configured, false);
    assert.equal(stripeStatus().keyMode, "invalid");

    process.env.STRIPE_SECRET_KEY = "sk_test_example";
    assert.equal(stripeStatus().configured, true);
    assert.equal(stripeStatus().keyMode, "test");
  } finally {
    restoreEnv(saved);
  }
});

test("invalid Stripe key fails before any checkout network request", async () => {
  const saved = saveEnv();
  try {
    process.env.STRIPE_SECRET_KEY = "invalid";
    process.env.STRIPE_LIVE_MODE_ENABLED = "false";
    await assert.rejects(
      createStripeCheckoutSession({
        user: { id: "usr_test", email: "test@streetwise.example" },
        plan: { id: "residential-home-25", name: "Streetwise Home", priceUsd: 25 }
      }),
      (error) => error.message === "stripe_secret_key_invalid" && error.statusCode === 503
    );
  } finally {
    restoreEnv(saved);
  }
});

test("live Stripe key remains blocked unless the explicit safety switch is enabled", async () => {
  const saved = saveEnv();
  try {
    process.env.STRIPE_SECRET_KEY = "sk_live_example";
    process.env.STRIPE_LIVE_MODE_ENABLED = "false";
    await assert.rejects(
      createStripeCheckoutSession({
        user: { id: "usr_test", email: "test@streetwise.example" },
        plan: { id: "residential-home-25", name: "Streetwise Home", priceUsd: 25 }
      }),
      (error) => error.message === "stripe_live_key_blocked_by_safety_switch" && error.statusCode === 503
    );
  } finally {
    restoreEnv(saved);
  }
});

test("webhook secret must use Stripe signing-secret format", () => {
  const saved = saveEnv();
  try {
    process.env.STRIPE_SECRET_KEY = "sk_test_example";
    process.env.STRIPE_WEBHOOK_SECRET = "bad-secret";
    assert.throws(
      () => verifyStripeWebhook(Buffer.from("{}"), "bad-signature"),
      (error) => error.message === "stripe_webhook_secret_invalid" && error.statusCode === 503
    );
  } finally {
    restoreEnv(saved);
  }
});
