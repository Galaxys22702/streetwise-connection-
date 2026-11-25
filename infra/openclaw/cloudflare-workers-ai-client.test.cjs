'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createCloudflareClient,guardedComplete}=require('./cloudflare-workers-ai-client.cjs');
const id='a'.repeat(32),model='@cf/meta/llama-3.1-8b-instruct';
test('rejects absent credentials',()=>assert.throws(()=>createCloudflareClient({accountId:id,model}),/not configured/));
test('rejects invalid model',()=>assert.throws(()=>createCloudflareClient({accountId:id,model:'paid/auto',apiToken:'test'}),/not configured/));
test('sends model and messages only to Cloudflare API',async()=>{
 let called=0;
 const client=createCloudflareClient({accountId:id,model,apiToken:'fake-test-token',fetchImpl:async(url,options)=>{
 called++;assert.equal(new URL(url).hostname,'api.cloudflare.com');
 assert.equal(options.headers.Authorization,'Bearer fake-test-token');
 assert.deepEqual(JSON.parse(options.body),{model,messages:[{role:'user',content:'hi'}],stream:false});
 return {ok:true,json:async()=>({choices:[{message:{content:'hello'}}]})};
 }});
 const response=await client([{role:'user',content:'hi'}]);
 assert.equal(called,1);assert.equal(response.choices[0].message.content,'hello');
});
test('no call when disabled',async()=>{
 let called=0;const result=await guardedComplete({gate:{enabled:false},client:async()=>{called++},messages:[]});
 assert.equal(called,0);assert.equal(result.decision.reason,'disabled');
});
test('provider 429 does not expose response body or token',async()=>{
 const client=createCloudflareClient({accountId:id,model,apiToken:'private-test-token',fetchImpl:async()=>({ok:false,status:429})});
 await assert.rejects(client([{role:'user',content:'hi'}]),e=>e.status===429&&!e.message.includes('private-test-token'));
});

const eligibleGate={enabled:true,primary:'openrouter/openrouter/free',status:429,primaryQuotaVerified:true,retryAfterSeconds:120,nowMs:100000,cloudflareConfigured:true,freeEntitlementVerified:true,providerCostKnownFree:true,budgetRequests:1,requestsUsed:0};
test('eligible fallback fails closed without quota reservation',async()=>{
 let calls=0;const r=await guardedComplete({gate:eligibleGate,client:async()=>{calls++},messages:[]});
 assert.equal(calls,0);assert.equal(r.decision.reason,'atomic_quota_reservation_required');
});
test('denied reservation never calls provider',async()=>{
 let calls=0;const r=await guardedComplete({gate:eligibleGate,reserveQuota:async()=>false,client:async()=>{calls++},messages:[]});
 assert.equal(calls,0);assert.equal(r.decision.reason,'quota_reservation_denied');
});
test('reservation precedes provider call',async()=>{
 const order=[];await guardedComplete({gate:eligibleGate,reserveQuota:async()=>{order.push('reserve');return true},client:async()=>{order.push('provider');return {}},messages:[]});
 assert.deepEqual(order,['reserve','provider']);
});

test('persistent quota survives recreation and rejects concurrent oversubscription',{skip:process.platform!=='linux'},async t=>{
 const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
 const {createQuotaReservation}=require('./cloudflare-workers-ai-client.cjs');
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'guardian-quota-'));
 t.after(()=>fs.rm(directory,{recursive:true,force:true}));
 const reserve=createQuotaReservation({directory,budget:2});
 const results=await Promise.all(Array.from({length:12},()=>reserve()));
 assert.equal(results.filter(Boolean).length,2);
 assert.equal(await createQuotaReservation({directory,budget:2})(),false);
 assert.equal(await createQuotaReservation({directory:path.join(directory,'missing'),budget:2})(),false);
});


test('provider request rejects redirects',async()=>{
 const client=createCloudflareClient({accountId:id,model,apiToken:'fake-test-token',fetchImpl:async(_url,options)=>{
  assert.equal(options.redirect,'error');
  return {ok:true,json:async()=>({choices:[{message:{content:'hello'}}]})};
 }});
 await client([{role:'user',content:'hi'}]);
});
test('missing, empty and oversized replies fail closed',async()=>{
 for(const payload of [{choices:[]},{choices:[{message:{content:' '}}]},{choices:[{message:{content:'x'.repeat(16001)}}]}]){
  const client=createCloudflareClient({accountId:id,model,apiToken:'fake-test-token',fetchImpl:async()=>({ok:true,json:async()=>payload})});
  await assert.rejects(client([{role:'user',content:'hi'}]),/Invalid Cloudflare response/);
 }
});

test('quota directory rejects symlinks, ordinary files and shared permissions',{skip:process.platform!=='linux'},async t=>{
 const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
 const {createQuotaReservation}=require('./cloudflare-workers-ai-client.cjs');
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'guardian-quota-safety-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const target=path.join(root,'target'),link=path.join(root,'link'),file=path.join(root,'file');
 await fs.mkdir(target,{mode:0o700});
 await fs.symlink(target,link);
 await fs.writeFile(file,'unchanged');
 for(const directory of [link,file]){
  assert.equal(await createQuotaReservation({directory,budget:1})(),false);
 }
 await fs.chmod(target,0o755);
 assert.equal(await createQuotaReservation({directory:target,budget:1})(),false);
 assert.deepEqual(await fs.readdir(target),[]);
 assert.equal(await fs.readFile(file,'utf8'),'unchanged');
 await fs.chmod(target,0o700);
 assert.equal(await createQuotaReservation({directory:target,budget:1})(),true);
 assert.deepEqual(await fs.readdir(target),['reservation-0']);
});
test('existing reservation symlink is not followed or replaced',{skip:process.platform!=='linux'},async t=>{
 const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
 const {createQuotaReservation}=require('./cloudflare-workers-ai-client.cjs');
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'guardian-quota-slot-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const target=path.join(root,'target');
 await fs.writeFile(target,'unchanged');
 await fs.symlink(target,path.join(root,'reservation-0'));
 assert.equal(await createQuotaReservation({directory:root,budget:1})(),false);
 assert.equal(await fs.readFile(target,'utf8'),'unchanged');
 assert.equal((await fs.lstat(path.join(root,'reservation-0'))).isSymbolicLink(),true);
});

test('reservation failure never calls provider and preserves cooldown',async()=>{
 let calls=0;
 const r=await guardedComplete({gate:eligibleGate,reserveQuota:async()=>{throw new Error('private storage failure')},client:async()=>{calls++},messages:[]});
 assert.equal(calls,0);
 assert.deepEqual(r.decision,{action:'stop',reason:'quota_reservation_unavailable',cooldownUntilMs:220000});
});
test('unverified quota never reserves or calls provider',async()=>{
 let calls=0;
 const r=await guardedComplete({gate:{...eligibleGate,primaryQuotaVerified:false},reserveQuota:async()=>{calls++;return true},client:async()=>{calls++},messages:[]});
 assert.equal(calls,0);
 assert.equal(r.decision.reason,'primary_quota_unverified');
});
