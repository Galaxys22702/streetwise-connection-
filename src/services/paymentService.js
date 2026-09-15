import { randomUUID } from "node:crypto";
import { plans } from "../config/plans.js";
import { query, withTransaction } from "../db/index.js";
import {
  createStripeCheckoutSession,
  stripeStatus,
  verifyStripeWebhook
} from "../providers/stripePaymentProvider.js";

function selectedProvider() {
  return String(process.env.PAYMENT_PROVIDER || "mock").trim().toLowerCase();
}

function planExists(planId) {
  return plans.some((plan) => plan.id === planId);
}

export function paymentProviderStatus() {
  const provider = selectedProvider();
  if (provider === "stripe") return stripeStatus();
  return {
    provider: "mock",
    configured: true,
    liveModeEnabled: false,
    webhookConfigured: false
  };
}

export async function createCheckout(user, { planId }) {
  const plan = plans.find((item) => item.id === planId);
  if (!plan || !Number.isFinite(Number(plan.priceUsd))) {
    const error = new Error("purchasable_plan_required");
    error.statusCode = 400;
    throw error;
  }

  if (selectedProvider() === "stripe") {
    return createStripeCheckoutSession({ user, plan });
  }

  return {
    provider: "mock",
    id: `mock_checkout_${randomUUID().replaceAll("-", "")}`,
    url: `${String(process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "")}/?checkout=mock`,
    status: "open",
    livemode: false,
    planId: plan.id
  };
}

async function recordEvent(client, event) {
  const inserted = await client.query(
    `INSERT INTO payment_events (id, provider, event_type)
     VALUES ($1, 'stripe', $2)
     ON CONFLICT (id) DO NOTHING
     RETURNING id`,
    [event.id, event.type]
  );
  return Boolean(inserted.rows[0]);
}

async function upsertSubscription(client, {
  userId,
  planId,
  providerCustomerId = null,
  providerSubscriptionId = null,
  status = "unknown",
  currentPeriodEnd = null
}) {
  if (!userId || !planExists(planId)) {
    const error = new Error("stripe_subscription_metadata_invalid");
    error.statusCode = 400;
    throw error;
  }

  await client.query(
    `INSERT INTO subscriptions (
       id, user_id, provider, provider_customer_id,
       provider_subscription_id, plan_id, status, current_period_end
     ) VALUES ($1, $2, 'stripe', $3, $4, $5, $6, $7)
     ON CONFLICT (user_id, provider)
     DO UPDATE SET
       provider_customer_id = COALESCE(EXCLUDED.provider_customer_id, subscriptions.provider_customer_id),
       provider_subscription_id = COALESCE(EXCLUDED.provider_subscription_id, subscriptions.provider_subscription_id),
       plan_id = EXCLUDED.plan_id,
       status = EXCLUDED.status,
       current_period_end = EXCLUDED.current_period_end,
       updated_at = NOW()`,
    [
      `sub_${randomUUID().replaceAll("-", "")}`,
      userId,
      providerCustomerId,
      providerSubscriptionId,
      planId,
      status,
      currentPeriodEnd
    ]
  );
}

function verifiedStripeEvent(rawBody, signature) {
  try {
    return verifyStripeWebhook(rawBody, signature);
  } catch (error) {
    if (error?.statusCode) throw error;
    const invalid = new Error("stripe_signature_invalid");
    invalid.statusCode = 400;
    throw invalid;
  }
}

export async function handleStripeWebhook(rawBody, signature) {
  const event = verifiedStripeEvent(rawBody, signature);

  return withTransaction(async (client) => {
    if (!(await recordEvent(client, event))) {
      return { received: true, duplicate: true, type: event.type };
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      await upsertSubscription(client, {
        userId: session.metadata?.streetwiseUserId || session.client_reference_id,
        planId: session.metadata?.streetwisePlanId,
        providerCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
        providerSubscriptionId: typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
        status: session.payment_status === "paid" ? "active" : "checkout_completed"
      });
    }

    if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
      const subscription = event.data.object;
      const endSeconds = subscription.current_period_end;
      await upsertSubscription(client, {
        userId: subscription.metadata?.streetwiseUserId,
        planId: subscription.metadata?.streetwisePlanId,
        providerCustomerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
        providerSubscriptionId: subscription.id,
        status: subscription.status,
        currentPeriodEnd: endSeconds ? new Date(endSeconds * 1000) : null
      });
    }

    return { received: true, duplicate: false, type: event.type };
  });
}

export async function getSubscriptionForUser(userId) {
  const result = await query(
    `SELECT provider, provider_customer_id, provider_subscription_id,
            plan_id, status, current_period_end, created_at, updated_at
     FROM subscriptions
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT 1`,
    [userId]
  );

  const row = result.rows[0];
  if (!row) return null;
  return {
    provider: row.provider,
    providerCustomerId: row.provider_customer_id,
    providerSubscriptionId: row.provider_subscription_id,
    planId: row.plan_id,
    status: row.status,
    currentPeriodEnd: row.current_period_end,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function hasActiveSubscription(userId) {
  const subscription = await getSubscriptionForUser(userId);
  return Boolean(subscription && ["active", "trialing"].includes(subscription.status));
}
