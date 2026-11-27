'use strict';
// Pure, default-off decision logic. No provider calls, secrets, or persistent writes.
// Verification flags are supplied by a trusted server-side caller, never by chat input.
const FREE_PRIMARY = 'openrouter/openrouter/free';
function integer(value) { return Number.isSafeInteger(value) && value >= 0; }
function planFallback(input) {
  const {enabled=false, primary, status, retryAfterSeconds, primaryQuotaVerified=false,
    nowMs, cooldownUntilMs=0, cloudflareConfigured=false,
    freeEntitlementVerified=false, budgetRequests, requestsUsed,
    providerCostKnownFree=false} = input || {};
  if (enabled !== true) return {action:'stop',reason:'disabled'};
  if (primary !== FREE_PRIMARY) return {action:'stop',reason:'unsupported_primary'};
  if (status !== 429) return {action:'stop',reason:'not_quota_error'};
  if (!integer(nowMs) || !integer(cooldownUntilMs)) return {action:'stop',reason:'invalid_clock'};
  if (!integer(retryAfterSeconds)) return {action:'stop',reason:'missing_retry_after'};
  // Never shorten a provider-supplied wait. Enforce a minimum wait for zero,
  // and fail closed rather than overflowing a timestamp.
  const waitMs = Math.max(60,retryAfterSeconds)*1000;
  if (!Number.isSafeInteger(waitMs) || !Number.isSafeInteger(nowMs+waitMs))
    return {action:'stop',reason:'invalid_clock'};
  const cooldown = Math.max(cooldownUntilMs, nowMs+waitMs);
  if (primaryQuotaVerified !== true)
    return {action:'stop',reason:'primary_quota_unverified',cooldownUntilMs:cooldown};
  if (cloudflareConfigured !== true || freeEntitlementVerified !== true || providerCostKnownFree !== true)
    return {action:'stop',reason:'cloudflare_not_verified',cooldownUntilMs:cooldown};
  if (!integer(budgetRequests) || !integer(requestsUsed) || budgetRequests===0 ||
      budgetRequests>10000 || requestsUsed>=budgetRequests)
    return {action:'stop',reason:'cloudflare_budget_exhausted',cooldownUntilMs:cooldown};
  return {action:'eligible',reason:'verified_free_quota',cooldownUntilMs:cooldown};
}
module.exports={FREE_PRIMARY,planFallback};
