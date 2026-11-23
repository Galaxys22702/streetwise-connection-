'use strict';
// Pure, default-off decision logic. No provider calls, secrets, or persistent writes.
const FREE_PRIMARY = 'openrouter/openrouter/free';
function integer(value) { return Number.isSafeInteger(value) && value >= 0; }
function planFallback(input) {
  const {enabled=false, primary=FREE_PRIMARY, status, retryAfterSeconds,
    nowMs, cooldownUntilMs=0, cloudflareConfigured=false,
    freeEntitlementVerified=false, budgetRequests=0, requestsUsed=0,
    providerCostKnownFree=false} = input || {};
  if (!enabled) return {action:'stop',reason:'disabled'};
  if (primary !== FREE_PRIMARY) return {action:'stop',reason:'unsupported_primary'};
  if (status !== 429) return {action:'stop',reason:'not_quota_error'};
  if (!integer(nowMs) || !integer(cooldownUntilMs)) return {action:'stop',reason:'invalid_clock'};
  if (!integer(retryAfterSeconds)) return {action:'stop',reason:'missing_retry_after'};
  const cooldown = Math.max(cooldownUntilMs, nowMs + Math.min(retryAfterSeconds,86400)*1000);
  if (!cloudflareConfigured || !freeEntitlementVerified || !providerCostKnownFree)
    return {action:'stop',reason:'cloudflare_not_verified',cooldownUntilMs:cooldown};
  if (!integer(budgetRequests) || !integer(requestsUsed) || budgetRequests===0 || requestsUsed>=budgetRequests)
    return {action:'stop',reason:'cloudflare_budget_exhausted',cooldownUntilMs:cooldown};
  return {action:'eligible',reason:'verified_free_quota',cooldownUntilMs:cooldown};
}
module.exports={FREE_PRIMARY,planFallback};
