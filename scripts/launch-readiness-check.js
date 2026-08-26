const env = process.env;

function fail(message) {
  throw new Error(message);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim().toLowerCase());
}

const launchMode = String(env.PUBLIC_LAUNCH_MODE || "waitlist").trim().toLowerCase();
const waitlistEnabled = env.WAITLIST_ENABLED === "true";
const databaseUrl = String(env.DATABASE_URL || "").trim();
const supportEmail = String(env.SUPPORT_EMAIL || "").trim();

if (launchMode !== "waitlist") {
  fail("public_launch_mode_must_remain_waitlist_before_commercial_launch");
}

if (env.STRIPE_LIVE_MODE_ENABLED === "true") {
  fail("stripe_live_mode_must_be_disabled_during_waitlist_launch");
}

if (env.ESIM_LIVE_ORDERS_ENABLED === "true") {
  fail("esim_live_orders_must_be_disabled_during_waitlist_launch");
}

if (waitlistEnabled) {
  if (!databaseUrl) fail("waitlist_requires_database_url");
  if (!isValidEmail(supportEmail)) fail("waitlist_requires_valid_support_email");
}

console.log(
  waitlistEnabled
    ? "Launch readiness: waitlist can open when the database connection succeeds."
    : "Launch readiness: safe waitlist-only mode; email collection remains disabled."
);
