'use strict';
const {planFallback}=require('./cloudflare-fallback-gate.cjs');
const ID=/^[a-f0-9]{32}$/i;
const MODEL=/^@[a-z0-9_-]+\/[a-z0-9_.-]+(?:\/[a-z0-9_.-]+)*$/i;
function createCloudflareClient({accountId,apiToken,model,fetchImpl=globalThis.fetch}) {
 if (!ID.test(accountId||'') || !MODEL.test(model||'') || !apiToken || typeof fetchImpl!=='function')
  throw new Error('Cloudflare provider not configured');
 const url='https://api.cloudflare.com/client/v4/accounts/'+accountId+'/ai/v1/chat/completions';
 return async function complete(messages) {
  if (!Array.isArray(messages) || messages.length===0) throw new Error('messages required');
  const response=await fetchImpl(url,{method:'POST',headers:{
   Authorization:'Bearer '+apiToken,'Content-Type':'application/json'
  },body:JSON.stringify({model,messages,stream:false})});
  if (!response.ok) {
   const err=new Error('Cloudflare inference failed (HTTP '+response.status+')');
   err.status=response.status;
   throw err;
  }
  const result=await response.json();
  if (!result || !Array.isArray(result.choices)) throw new Error('Invalid Cloudflare response');
  return result;
 };
}
// An explicit caller-owned, durable quota counter is required; this helper never increments it.
async function guardedComplete({gate,client,messages}) {
 const decision=planFallback(gate);
 if(decision.action!=='eligible') return {decision};
 if(typeof client!=='function') return {decision:{action:'stop',reason:'client_missing'}};
 return {decision,result:await client(messages)};
}
module.exports={createCloudflareClient,guardedComplete};
