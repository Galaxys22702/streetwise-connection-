import { validatedBooleanEnv } from "../src/config/env.js";
import { waitlistStatus } from "../src/services/waitlistService.js";

const env = process.env;

function fail(message) {
  throw new Error(message);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim().toLowerCase());
}

const launchMode = String(env.PUBLIC_LAUNCH_MODE || "waitlist").trim().toLowerCase();
const paymentProvider = String(env.PAYMENT_PROVIDER || "mock").trim().toLowerCase();
const esimProvider = String(env.ESIM_PROVIDER || "mock").trim().toLowerCase();

// Validate every boolean launch/control value even when its current value is false.
validatedBooleanEnv("WAITLIST_ENABLED", env.VERCEL_ENV === "production");
const stripeLive = validatedBooleanEnv("STRIPE_LIVE_MODE_ENABLED");
validatedBooleanEnv("ESIM_WEBHOOKS_ENABLED");
const esimLive = validatedBooleanEnv("ESIM_LIVE_ORDERS_ENABLED");
validatedBooleanEnv("ATT_COMMERCIAL_CONTRACT_APPROVED");
const attLive = validatedBooleanEnv("ATT_LIVE_PROVISIONING_ENABLED");

const waitlist = waitlistStatus();

if (launchMode !== "waitlist") {
  fail("public_launch_mode_must_remain_waitlist_before_commercial_launch");
}
if (!new Set(["mock", "stripe"]).has(paymentProvider)) {
  fail("unsupported_payment_provider");
}
if (!new Set(["mock", "esim-go"]).has(esimProvider)) {
  fail("unsupported_esim_provider");
}
if (stripeLive) {
  fail("stripe_live_mode_must_be_disabled_during_waitlist_launch");
}
if (esimLive) {
  fail("esim_live_orders_must_be_disabled_during_waitlist_launch");
}
if (attLive) {
  fail("att_live_provisioning_must_be_disabled_during_waitlist_launch");
}

if (waitlist.open) {
  if (!waitlist.storageConfigured) fail("waitlist_requires_durable_storage");
  if (!isValidEmail(waitlist.supportEmail)) fail("waitlist_requires_valid_support_email");
}

console.log(
  waitlist.open
    ? "Launch readiness: public waitlist can open with dedicated Supabase storage."
    : "Launch readiness: safe waitlist-only mode; email collection remains disabled."
);
