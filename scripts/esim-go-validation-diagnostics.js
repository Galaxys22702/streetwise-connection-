import { createEsimOrder } from "../src/providers/esimGoProvider.js";

const apiKey = String(process.env.ESIM_API_KEY || "").trim();
const baseUrl = String(process.env.ESIM_API_BASE_URL || "https://api.esim-go.com/v2.5").replace(/\/$/, "");
const bundleName = String(process.env.ESIM_DIAGNOSTIC_BUNDLE || "esim_3GB_30D_US_V2").trim();

if (!apiKey) {
  console.error("ESIM_API_KEY is required.");
  process.exit(2);
}

process.env.ESIM_LIVE_ORDERS_ENABLED = "false";

const organisationResponse = await fetch(`${baseUrl}/organisation`, {
  headers: { Accept: "application/json", "X-API-Key": apiKey }
});
const organisationPayload = await organisationResponse.json().catch(() => ({}));
if (!organisationResponse.ok) {
  console.error(`Organisation check failed with HTTP ${organisationResponse.status}.`);
  process.exit(3);
}

const organisation = Array.isArray(organisationPayload?.organisations)
  ? organisationPayload.organisations[0] || {}
  : organisationPayload;
const balance = Number(organisation?.balance);
const testCredit = Number(organisation?.testCredit);

const validation = await createEsimOrder({
  bundleName,
  quantity: 1,
  validateOnly: true
});

const quotedTotal = Number(validation.total);
const providerPayload = validation.providerPayload || {};
const safeMessage = String(
  providerPayload?.statusMessage || providerPayload?.message || validation.statusMessage || ""
).trim().slice(0, 300);

const hasKnownBalance = Number.isFinite(balance);
const hasPositiveBalance = hasKnownBalance ? balance > 0 : null;
const hasTestCredit = Number.isFinite(testCredit) ? testCredit > 0 : null;
const hasSufficientBalanceForQuote = hasKnownBalance && Number.isFinite(quotedTotal)
  ? balance >= quotedTotal
  : null;
const readiness = validation.valid === true
  ? "validated"
  : hasSufficientBalanceForQuote === false
    ? "balance_required_before_validation_can_pass"
    : "validation_blocked_unknown_reason";

const summary = {
  bundleName,
  mode: validation.mode,
  liveOrderExecuted: validation.liveOrderExecuted,
  valid: validation.valid,
  status: validation.status,
  quotedTotal: Number.isFinite(quotedTotal) ? quotedTotal : null,
  currency: validation.currency,
  hasPositiveBalance,
  hasTestCredit,
  hasSufficientBalanceForQuote,
  readiness,
  providerMessage: safeMessage || null
};

console.log(JSON.stringify(summary, null, 2));

if (validation.liveOrderExecuted) {
  console.error("Safety failure: diagnostic executed a live order.");
  process.exit(4);
}

if (validation.valid !== true && hasSufficientBalanceForQuote !== false) {
  console.error("Provider validation is blocked for a reason not explained by the safe balance check.");
  process.exit(5);
}

if (validation.valid !== true) {
  console.log("Validation remains incomplete because the account balance does not cover the quoted validation cost. No top-up was attempted.");
}
