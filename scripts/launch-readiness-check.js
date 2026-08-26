import { waitlistStatus } from "../src/services/waitlistService.js";

const env = process.env;

function fail(message) {
  throw new Error(message);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim().toLowerCase());
}

const launchMode = String(env.PUBLIC_LAUNCH_MODE || "waitlist").trim().toLowerCase();
const waitlist = waitlistStatus();

if (launchMode !== "waitlist") {
  fail("public_launch_mode_must_remain_waitlist_before_commercial_launch");
}

if (env.STRIPE_LIVE_MODE_ENABLED === "true") {
  fail("stripe_live_mode_must_be_disabled_during_waitlist_launch");
}

if (env.ESIM_LIVE_ORDERS_ENABLED === "true") {
  fail("esim_live_orders_must_be_disabled_during_waitlist_launch");
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
