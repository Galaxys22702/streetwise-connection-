import Stripe from "stripe";

function stripeKey() {
  return String(process.env.STRIPE_SECRET_KEY || "").trim();
}

function client() {
  const key = stripeKey();
  if (!key) {
    const error = new Error("stripe_secret_key_not_configured");
    error.statusCode = 503;
    throw error;
  }

  if (key.startsWith("sk_live_") && process.env.STRIPE_LIVE_MODE_ENABLED !== "true") {
    const error = new Error("stripe_live_key_blocked_by_safety_switch");
    error.statusCode = 503;
    throw error;
  }

  return new Stripe(key, { maxNetworkRetries: 2 });
}

export function stripeStatus() {
  const key = stripeKey();
  return {
    provider: "stripe",
    configured: Boolean(key),
    keyMode: key.startsWith("sk_live_") ? "live" : key.startsWith("sk_test_") ? "test" : key ? "unknown" : "none",
    liveModeEnabled: process.env.STRIPE_LIVE_MODE_ENABLED === "true",
    webhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET)
  };
}

export async function createStripeCheckoutSession({ user, plan }) {
  const stripe = client();
  const baseUrl = String(
    process.env.APP_BASE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
  const configuredPrice = String(process.env.STRIPE_PRICE_ID || "").trim();

  const lineItem = configuredPrice
    ? { price: configuredPrice, quantity: 1 }
    : {
        price_data: {
          currency: "usd",
          unit_amount: Math.round(Number(plan.priceUsd) * 100),
          recurring: { interval: "month" },
          product_data: { name: plan.name }
        },
        quantity: 1
      };

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    client_reference_id: user.id,
    customer_email: user.email,
    line_items: [lineItem],
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
  return client().webhooks.constructEvent(rawBody, signature, secret);
}
