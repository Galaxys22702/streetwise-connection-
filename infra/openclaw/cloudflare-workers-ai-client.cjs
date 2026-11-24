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
  const response=await fetchImpl(url,{method:'POST',signal:AbortSignal.timeout(15000),headers:{
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
async function guardedComplete({gate,client,messages,reserveQuota}) {
 const decision=planFallback(gate);
 if(decision.action!=='eligible') return {decision};
 if(typeof client!=='function') return {decision:{action:'stop',reason:'client_missing'}};
 if(typeof reserveQuota!=='function') return {decision:{action:'stop',reason:'atomic_quota_reservation_required'}};
 if(await reserveQuota() !== true) return {decision:{action:'stop',reason:'quota_reservation_denied'}};
 return {decision,result:await client(messages)};
}

 // Conservative lifetime budget: atomic exclusive slot creation on a shared persistent
 // filesystem. No automatic reset or refund, including after provider failure.
 function createQuotaReservation({directory,budget}) {
  const fs=require('node:fs/promises'), path=require('node:path');
  if(typeof directory!=='string'||!path.isAbsolute(directory)||!Number.isSafeInteger(budget)||budget<1||budget>10000)
   throw new Error('Invalid persistent quota configuration');
  return async function reserveQuota(){
   try {
    const stat=await fs.lstat(directory);
    if(!stat.isDirectory()||stat.isSymbolicLink()) return false;
    for(let i=0;i<budget;i++){
     let handle;
     try {handle=await fs.open(path.join(directory,'reservation-'+i),'wx',0o600);}
     catch(e){if(e.code==='EEXIST') continue;return false;}
     try {await handle.sync();} finally {await handle.close();}
     const dir=await fs.open(directory,'r');
     try {await dir.sync();} finally {await dir.close();}
     return true;
    }
   } catch {return false;}
   return false;
  };
 }

module.exports={createCloudflareClient,guardedComplete,createQuotaReservation};
