'use strict';
// Opt-in OpenRouter transport guard. No alternate-provider calls.
const fs=require('node:fs/promises');
const path=require('node:path');
const {O_RDONLY,O_DIRECTORY,O_NOFOLLOW,O_WRONLY,O_CREAT,O_EXCL}=require('node:fs').constants;
const FREE_URL='https://openrouter.ai/api/v1/chat/completions';
function createAdmission(directory){
 return async function acquire(){
  if(process.platform!=='linux'||typeof process.getuid!=='function'||
     !Number.isInteger(O_DIRECTORY)||!Number.isInteger(O_NOFOLLOW)) return null;
  let dir,marker;
  try{
   dir=await fs.open(directory,O_RDONLY|O_DIRECTORY|O_NOFOLLOW);
   const info=await dir.stat();
   if(!info.isDirectory()||info.uid!==process.getuid()||(info.mode&0o077)!==0) throw Error('unsafe admission directory');
   const target=path.join('/proc/self/fd/'+dir.fd,'in-flight');
   marker=await fs.open(target,O_WRONLY|O_CREAT|O_EXCL|O_NOFOLLOW,0o600);
   await marker.sync();
   await marker.close();marker=null;
   await dir.sync();
   let closed=false;
   return async function finish(safe){
    if(closed) return;
    closed=true;
    try{
     if(safe){await fs.unlink(target);await dir.sync();}
    }finally{await dir.close();}
   };
  }catch{
   // If marker creation succeeded but durability failed, leave it in place.
   if(marker) await marker.close().catch(()=>{});
   if(dir) await dir.close().catch(()=>{});
   return null;
  }
 };
}
function deadlineFromResponse(response,now){
 const value=response?.headers?.get('retry-after')?.trim();
 let wait=900000;
 if(!Number.isSafeInteger(now)||now<0)return null;
 if(value&&/^\d+(?:\.\d+)?$/.test(value)){
  wait=Math.max(60000,Math.ceil(Number(value)*1000));
 }else if(value){
  const date=Date.parse(value);
  if(Number.isFinite(date)) wait=Math.max(60000,date-now);
 }
 const deadline=now+wait;
 return Number.isSafeInteger(deadline)&&deadline>=now?deadline:null;
}
function acceptedRequest(model,input,init){
 if(model?.provider!=='openrouter'||!['free','openrouter/free'].includes(model.id))return false;
 // The pinned OpenAI SDK supplies URL/string plus JSON init. Unknown request
 // shapes are deliberately blocked rather than consumed or rewritten.
 if(typeof input!=='string'&&!(input instanceof URL))return false;
 if(String(input)!==FREE_URL||init?.method?.toUpperCase()!=='POST'||
    typeof init.body!=='string'||init.body.length>2_000_000)return false;
 try{
  const body=JSON.parse(init.body);
  return body?.model==='openrouter/free'&&
   (!Object.hasOwn(body,'models'))&&(!Object.hasOwn(body,'plugins'))&&
   (!Object.hasOwn(body,'route'));
 }catch{return false;}
}
function createForegroundGuard({model,original,store,acquire,now=Date.now}){
 return async function guarded(input,init){
  const stop=()=>new Error('JARVIS free-route admission blocked; check persistent cooldown state');
  if(!acceptedRequest(model,input,init))throw stop();
  if(init?.signal?.aborted)throw init.signal.reason??stop();
  const finish=await acquire();
  if(typeof finish!=='function')throw stop();
  let response,safe=false;
  try{
   const current=now(),deadline=await store.read();
   if(!Number.isSafeInteger(current)||current<0||!Number.isSafeInteger(deadline)||deadline<0)throw stop();
   if(current<deadline){safe=true;throw stop();}
   if(init?.signal?.aborted){safe=true;throw init.signal.reason??stop();}
   try{response=await original(input,init);}
   catch(error){
    const until=deadlineFromResponse(null,now());
    if(until!==null&&await store.record(until)===true)safe=true;
    throw error;
   }
   if(response.status===429){
    const until=deadlineFromResponse(response,now());
    if(until===null||await store.record(until)!==true)throw stop();
   }
   safe=true;
   return response;
  }finally{
   try{await finish(safe);}
   catch(error){
    if(response?.body)void response.body.cancel().catch(()=>{});
    throw stop();
   }
   if(!safe&&response?.body)void response.body.cancel().catch(()=>{});
  }
 };
}
function wrapModelFetch(model,original){
 if(process.env.JARVIS_FOREGROUND_COOLDOWN!=='1'||model?.provider!=='openrouter')return original;
 const {createCooldownStore}=require('./cloudflare-workers-ai-client.cjs');
 return createForegroundGuard({model,original,
  store:createCooldownStore({directory:'/data/jarvis-foreground-cooldown'}),
  acquire:createAdmission('/data/jarvis-foreground-admission')});
}
module.exports={createAdmission,createForegroundGuard,deadlineFromResponse,wrapModelFetch};
