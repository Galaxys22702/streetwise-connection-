import Stripe from "stripe";

const STRIPE_TIMEOUT_MS = 15_000;

function stripeKey() {
  return String(process.env.STRIPE_SECRET_KEY || "").trim();
}

function keyMode(key = stripeKey()) {
  if (key.startsWith("sk_test_")) return "test";
  if (key.startsWith("sk_live_")) return "live";
  return key ? "invalid" : "none";
}

function client() {
  const key = stripeKey();
  const mode = keyMode(key);
  if (mode === "none") {
    const error = new Error("stripe_secret_key_not_configured");
    error.statusCode = 503;
    throw error;
  }
  if (mode === "invalid") {
    const error = new Error("stripe_secret_key_invalid");
    error.statusCode = 503;
    throw error;
  }
  if (mode === "live" && process.env.STRIPE_LIVE_MODE_ENABLED !== "true") {
    const error = new Error("stripe_live_key_blocked_by_safety_switch");
    error.statusCode = 503;
    throw error;
  }

  return new Stripe(key, {
    maxNetworkRetries: 2,
    timeout: STRIPE_TIMEOUT_MS
  });
}

function deploymentBaseUrl() {
  const explicit = String(process.env.APP_BASE_URL || "").trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercelHost = String(
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || ""
  ).trim();
  if (vercelHost) return `https://${vercelHost.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;

  return "http://localhost:3000";
}

export function stripeStatus() {
  const key = stripeKey();
  const mode = keyMode(key);
  const webhookSecret = String(process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  return {
    provider: "stripe",
    configured: mode === "test" || mode === "live",
    keyMode: mode,
    liveModeEnabled: process.env.STRIPE_LIVE_MODE_ENABLED === "true",
    webhookConfigured: webhookSecret.startsWith("whsec_")
  };
}

export async function createStripeCheckoutSession({ user, plan }) {
  const stripe = client();
  const baseUrl = deploymentBaseUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    client_reference_id: user.id,
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: Math.round(Number(plan.priceUsd) * 100),
          recurring: { interval: "month" },
          product_data: { name: plan.name }
        },
        quantity: 1
      }
    ],
    success_url: `${baseUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/?checkout=cancelled`,
    metadata: {
      streetwiseUserId: user.id,
      streetwisePlanId: plan.id
    },
    subscription_data: {
      metadata: {
        streetwiseUserId: user.id,
        streetwisePlanId: plan.id
      }
    }
  });

  return {
    provider: "stripe",
    id: session.id,
    url: session.url,
    status: session.status,
    livemode: session.livemode
  };
}

export function verifyStripeWebhook(rawBody, signature) {
  const secret = String(process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  if (!secret) {
    const error = new Error("stripe_webhook_secret_not_configured");
    error.statusCode = 503;
    throw error;
  }
  if (!secret.startsWith("whsec_")) {
    const error = new Error("stripe_webhook_secret_invalid");
    error.statusCode = 503;
    throw error;
  }
  return client().webhooks.constructEvent(rawBody, signature, secret);
}
