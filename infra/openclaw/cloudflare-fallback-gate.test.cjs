'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {planFallback}=require('./cloudflare-fallback-gate.cjs');
const base={enabled:true,primary:'openrouter/openrouter/free',status:429,primaryQuotaVerified:true,retryAfterSeconds:120,
 nowMs:100000,cooldownUntilMs:0,cloudflareConfigured:true,freeEntitlementVerified:true,
 providerCostKnownFree:true,budgetRequests:10,requestsUsed:2};
test('default off',()=>assert.equal(planFallback({...base,enabled:false}).reason,'disabled'));
test('normal success does not fall back',()=>assert.equal(planFallback({...base,status:200}).reason,'not_quota_error'));
test('400 thinking mismatch does not fall back',()=>assert.equal(planFallback({...base,status:400}).reason,'not_quota_error'));
test('unknown entitlement fails closed',()=>assert.equal(planFallback({...base,freeEntitlementVerified:false}).reason,'cloudflare_not_verified'));
test('unknown cost fails closed',()=>assert.equal(planFallback({...base,providerCostKnownFree:false}).reason,'cloudflare_not_verified'));
test('missing credential fails closed',()=>assert.equal(planFallback({...base,cloudflareConfigured:false}).reason,'cloudflare_not_verified'));
test('budget exhausted fails closed',()=>assert.equal(planFallback({...base,requestsUsed:10}).reason,'cloudflare_budget_exhausted'));
test('unknown budget fails closed',()=>assert.equal(planFallback({...base,budgetRequests:0}).reason,'cloudflare_budget_exhausted'));
test('missing retry-after fails closed',()=>assert.equal(planFallback({...base,retryAfterSeconds:undefined}).reason,'missing_retry_after'));
test('paid primary not eligible',()=>assert.equal(planFallback({...base,primary:'openrouter/openrouter/auto'}).reason,'unsupported_primary'));
test('verified free quota is eligible',()=>assert.deepEqual(planFallback(base),{action:'eligible',reason:'verified_free_quota',cooldownUntilMs:220000}));
test('existing longer cooldown preserved',()=>assert.equal(planFallback({...base,cooldownUntilMs:500000}).cooldownUntilMs,500000));

test('truthy strings cannot authorize provider calls',()=>{
 for(const flag of ['enabled','primaryQuotaVerified','cloudflareConfigured','freeEntitlementVerified','providerCostKnownFree']){
  for(const value of ['true','false',1,{},null]){
   assert.equal(planFallback({...base,[flag]:value}).action,'stop');
  }
 }
});
test('missing primary route, quota proof or usage fail closed',()=>{
 for(const flag of ['primary','primaryQuotaVerified','requestsUsed']){
  const input={...base};delete input[flag];
  assert.equal(planFallback(input).action,'stop');
 }
});
test('cooldown preserves long waits, bounds zero and rejects overflow',()=>{
 assert.equal(planFallback({...base,retryAfterSeconds:172800}).cooldownUntilMs,172900000);
 assert.equal(planFallback({...base,retryAfterSeconds:0}).cooldownUntilMs,160000);
 assert.equal(planFallback({...base,nowMs:Number.MAX_SAFE_INTEGER}).action,'stop');
 assert.equal(planFallback({...base,retryAfterSeconds:Number.MAX_SAFE_INTEGER}).action,'stop');
});
test('budget must fit persistent reservation capacity',()=>{
 assert.equal(planFallback({...base,budgetRequests:10001}).action,'stop');
});
