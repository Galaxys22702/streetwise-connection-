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
  const response=await fetchImpl(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{
   Authorization:'Bearer '+apiToken,'Content-Type':'application/json'
  },body:JSON.stringify({model,messages,stream:false})});
  if (!response.ok) {
   const err=new Error('Cloudflare inference failed (HTTP '+response.status+')');
   err.status=response.status;
   throw err;
  }
  const result=await response.json();
  const reply=result?.choices?.[0]?.message?.content;
  if (typeof reply!=='string' || !reply.trim() || reply.length>16000) throw new Error('Invalid Cloudflare response');
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

// Conservative lifetime budget: atomic exclusive slots, never automatically reset.
 // Linux container only. Use an owner-private directory under a trusted persistent
 // parent; the owner must not rename, replace or delete it while in service.
 // Pin the directory inode for each reservation, rather than checking a path
 // and subsequently reopening it. A missing procfs or unsupported OS fails closed.
 function createQuotaReservation({directory,budget}) {
  const fs=require('node:fs/promises'), path=require('node:path');
  const {O_RDONLY,O_DIRECTORY,O_NOFOLLOW,O_WRONLY,O_CREAT,O_EXCL}=require('node:fs').constants;
  if(typeof directory!=='string'||!path.isAbsolute(directory)||!Number.isSafeInteger(budget)||budget<1||budget>10000)
   throw new Error('Invalid persistent quota configuration');
  return async function reserveQuota(){
   if(process.platform!=='linux'||typeof process.getuid!=='function'||
      !Number.isInteger(O_DIRECTORY)||!Number.isInteger(O_NOFOLLOW)) return false;
   try {
    const dir=await fs.open(directory,O_RDONLY|O_DIRECTORY|O_NOFOLLOW);
    try {
     const info=await dir.stat();
     if(!info.isDirectory()||info.uid!==process.getuid()||(info.mode&0o077)!==0) return false;
     const pinned='/proc/self/fd/'+dir.fd;
     for(let i=0;i<budget;i++){
      let handle;
      try {handle=await fs.open(path.join(pinned,'reservation-'+i),O_WRONLY|O_CREAT|O_EXCL|O_NOFOLLOW,0o600);}
      catch(e){if(e.code==='EEXIST') continue;return false;}
      try {await handle.sync();} finally {await handle.close();}
      await dir.sync();
      return true;
     }
    } finally {await dir.close();}
   } catch {return false;}
   return false;
  };
 }

module.exports={createCloudflareClient,guardedComplete,createQuotaReservation};
