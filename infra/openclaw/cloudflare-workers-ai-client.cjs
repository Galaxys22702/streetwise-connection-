'use strict';
const {planFallback,FREE_PRIMARY}=require('./cloudflare-fallback-gate.cjs');
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
async function guardedComplete({gate,client,messages,reserveQuota,cooldownStore}) {
 const decision=planFallback(gate);
 const stop=reason=>({decision:{...decision,action:'stop',reason}});
 // Persist the primary cooldown before any alternate inference or quota use.
 // Even a rejected fallback with a valid deadline must record that deadline.
 if(Number.isSafeInteger(decision.cooldownUntilMs)){
  if(typeof cooldownStore?.record!=='function') return stop('persistent_cooldown_required');
  try {
   if(await cooldownStore.record(decision.cooldownUntilMs)!==true)
    return stop('cooldown_storage_unavailable');
  } catch {return stop('cooldown_storage_unavailable');}
 }
 if(decision.action!=='eligible') return {decision};
 if(typeof client!=='function') return stop('client_missing');
 if(typeof reserveQuota!=='function') return stop('atomic_quota_reservation_required');
 try {
  if(await reserveQuota() !== true) return stop('quota_reservation_denied');
 } catch {
  return stop('quota_reservation_unavailable');
 }
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

// Dedicated, owner-private Linux directory, provisioned on a persistent volume.
// Immutable deadline markers avoid overwriting a longer concurrent cooldown.
// No automatic deletion. A missing, malformed or exhausted store is unavailable.
function createCooldownStore({directory}) {
 const fs=require('node:fs/promises'),path=require('node:path');
 const {O_RDONLY,O_DIRECTORY,O_NOFOLLOW,O_WRONLY,O_CREAT,O_EXCL}=require('node:fs').constants;
 if(typeof directory!=='string'||!path.isAbsolute(directory)) throw new Error('Invalid cooldown directory');
 const limit=4096;
 async function accessStore(operation){
  if(process.platform!=='linux'||typeof process.getuid!=='function'||
     !Number.isInteger(O_DIRECTORY)||!Number.isInteger(O_NOFOLLOW)) return null;
  try{
   const dir=await fs.open(directory,O_RDONLY|O_DIRECTORY|O_NOFOLLOW);
   try{
    const info=await dir.stat();
    if(!info.isDirectory()||info.uid!==process.getuid()||(info.mode&0o077)!==0) return null;
    const pinned='/proc/self/fd/'+dir.fd;
    const entries=await fs.readdir(pinned,{withFileTypes:true});
    if(entries.length>limit) return null;
    const deadlines=new Set();
    for(const entry of entries){
     const match=/^deadline-(0|[1-9][0-9]{0,15})$/.exec(entry.name);
     if(!entry.isFile()||!match||!Number.isSafeInteger(Number(match[1]))) return null;
     deadlines.add(Number(match[1]));
    }
    return await operation(dir,pinned,deadlines);
   }finally{await dir.close();}
  }catch{return null;}
 }
 return {
  async read(){
   return accessStore(async(_dir,_pinned,deadlines)=>Math.max(0,...deadlines));
  },
  async record(deadline){
   if(!Number.isSafeInteger(deadline)||deadline<0) return false;
   const saved=await accessStore(async(dir,pinned,deadlines)=>{
    if(Math.max(0,...deadlines)>=deadline){await dir.sync();return true;}
    if(deadlines.size>=limit) return false;
    let marker;
    try{marker=await fs.open(path.join(pinned,'deadline-'+deadline),O_WRONLY|O_CREAT|O_EXCL|O_NOFOLLOW,0o600);}
    catch(error){
     // A concurrent identical marker is not treated as committed by this writer.
     // The next read may observe it; this call fails closed.
     if(error.code==='EEXIST') return false;
     throw error;
    }
    try{await marker.sync();}finally{await marker.close();}
    await dir.sync();
    return true;
   });
   return saved===true;
  }
 };
}

// Caller-owned preflight for the primary transport. No implicit network access.
// The caller must route every OpenRouter attempt through this boundary.
async function guardedPrimary({route,cooldownStore,request,now=Date.now}={}){
 const stop=(reason,extra={})=>({decision:{action:'stop',reason,...extra}});
 if(route!==FREE_PRIMARY) return stop('unsupported_primary');
 if(typeof request!=='function'||typeof cooldownStore?.read!=='function'||typeof now!=='function')
  return stop('primary_guard_unavailable');
 let deadline,current;
 try{
  deadline=await cooldownStore.read();
  current=now();
 }catch{return stop('cooldown_storage_unavailable');}
 if(!Number.isSafeInteger(deadline)||deadline<0) return stop('cooldown_storage_unavailable');
 if(!Number.isSafeInteger(current)||current<0) return stop('invalid_clock');
 if(current<deadline) return stop('primary_cooldown_active',{cooldownUntilMs:deadline});
 return {decision:{action:'allowed',reason:'primary_cooldown_clear'},result:await request(FREE_PRIMARY)};
}

module.exports={createCloudflareClient,guardedComplete,createQuotaReservation,createCooldownStore,guardedPrimary};
