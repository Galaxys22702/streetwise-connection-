import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import net from 'node:net';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function freePort(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}

test('private bridge, approval, redaction, receipts and verification state',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'streetwise-e2e-')),port=await freePort();const base=`http://127.0.0.1:${port}`;
 const proc=spawn(process.execPath,[new URL('../server.mjs',import.meta.url).pathname],{env:{...process.env,STREETWISE_PORT:String(port),STREETWISE_DATA_DIR:dir},stdio:['ignore','pipe','pipe']});
 try{
   let ready=false;for(let i=0;i<100;i++){if(proc.exitCode!==null)throw new Error('Controller exited');try{const r=await fetch(base+'/api/health');if(r.ok){ready=true;break}}catch{}await sleep(50)}assert.ok(ready,'Controller started');
   const ownerKey=(await readFile(join(dir,'owner-key'),'utf8')).trim();let cookie='';
   const request=async(path,{method='GET',body,bridgeKey,deviceId,otherHost}={})=>{
    const headers={};if(cookie)headers.cookie=cookie;if(body!==undefined){headers['content-type']='application/json';headers['x-streetwise-request']='owner-ui'}
    if(bridgeKey){headers['x-streetwise-bridge-key']=bridgeKey;headers['x-streetwise-device']=deviceId}
    if(otherHost)headers.origin='https://evil.example';
    const res=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
    return {code:res.status,data:await res.json().catch(()=>null),cookie:res.headers.get('set-cookie')};
   };
   assert.equal((await request('/api/health')).data.telephony,'not connected');
   assert.equal((await request('/api/state')).code,401);
   assert.equal((await request('/api/login',{method:'POST',body:{key:'bad'}})).code,401);
   const login=await request('/api/login',{method:'POST',body:{key:ownerKey}});assert.equal(login.code,200);
   cookie=login.cookie.split(';')[0];
   const d=await request('/api/devices',{method:'POST',body:{alias:'Test Android',platform:'Android',last4:'555-1234'}});assert.equal(d.code,201);
   const deviceId=d.data.device.id;assert.equal(d.data.device.last4,'1234');
   const state=await request('/api/state');assert.equal(state.code,200);assert.equal(state.data.devices[0].bridgeHash,undefined);
   const keyResult=await request(`/api/devices/${deviceId}/bridge-token`,{method:'POST',body:{}});assert.equal(keyResult.code,200);const bridgeKey=keyResult.data.bridgeKey;
   assert.equal((await request('/api/bridge/event',{method:'POST',body:{kind:'sms',reference:'test-msg-001'},deviceId,bridgeKey:'invalid'})).code,403);
   const payload={kind:'sms',reference:'test-msg-001',fromLast4:'5551234'};
   const first=await request('/api/bridge/event',{method:'POST',body:payload,deviceId,bridgeKey});assert.equal(first.code,201);
   assert.equal((await request('/api/bridge/event',{method:'POST',body:payload,deviceId,bridgeKey})).data.duplicate,true);
   assert.equal((await request('/api/bridge/event',{method:'POST',body:{...payload,reference:'test-msg-002',body:'PRIVATE MESSAGE'},deviceId,bridgeKey})).code,400);
   const eventId=first.data.eventId;const pre=(await request('/api/state')).data.events[0];assert.equal(pre.status,'needs-approval');assert.equal(pre.source,'authenticated device bridge');
   assert.equal((await request(`/api/events/${eventId}/approve`,{method:'POST',body:{confirm:false}})).code,400);
   const approved=await request(`/api/events/${eventId}/approve`,{method:'POST',body:{confirm:true}});assert.equal(approved.code,200);assert.equal(approved.data.sent,false);
   assert.equal((await request(`/api/events/${eventId}/confirm-delivery`,{method:'POST',body:{confirm:true,proof:'short'}})).code,400);
   const delivery=await request(`/api/events/${eventId}/confirm-delivery`,{method:'POST',body:{confirm:true,proof:'external-delivery-test-003'}});assert.equal(delivery.code,200);assert.equal(delivery.data.sentByController,false);
   const failedVerified=await request('/api/checks',{method:'POST',body:{deviceId,capability:'sms-in',status:'verified',completed:false}});assert.equal(failedVerified.code,400);
   const check=await request('/api/checks',{method:'POST',body:{deviceId,capability:'sms-in',status:'unverified',completed:false,next:'Perform consented end-to-end test'}});assert.equal(check.code,201);
   assert.equal((await request('/api/state')).data.checks[0].status,'unverified');
   const js=await fetch(base+'/app.js');assert.equal(js.status,200);assert.ok((await js.text()).includes('No SMS or call was sent'));
   // Inbound bridge without the scoped key is rejected, not treated as a server error.
   assert.equal((await request('/api/bridge/event',{method:'POST',body:{kind:'call',reference:'test-call-unauth'},deviceId})).code,403);
   // A completed device check is scoped to this exact Android device/integration.
   assert.equal((await request('/api/checks',{method:'POST',body:{deviceId,capability:'sms-in',status:'verified',completed:true,evidence:'consented-test-receipt-001'}})).code,201);
   const iphone=await request('/api/devices',{method:'POST',body:{alias:'Test iPhone',platform:'iPhone / iOS',integration:'Not connected'}});
   assert.equal(iphone.code,201);
   const scoped=(await request('/api/state')).data;
   assert.equal(scoped.checks.filter(c=>c.deviceId===iphone.data.device.id&&c.status==='verified').length,0);
   // Concurrent inbound notifications cannot corrupt durable snapshots.
   const concurrent=await Promise.all(Array.from({length:7},(_,i)=>request('/api/bridge/event',{method:'POST',body:{kind:'call',reference:`test-call-${i.toString().padStart(3,'0')}`},deviceId,bridgeKey})));
   assert.ok(concurrent.every(x=>x.code===201));
   const atRest=JSON.parse(await readFile(join(dir,'state.json'),'utf8'));
   assert.ok(atRest.events.length>=8);
   assert.ok(!JSON.stringify(atRest).includes('PRIVATE MESSAGE'));
   // Destructive local clear is protected by exact confirmation.
   assert.equal((await request('/api/privacy/erase-local',{method:'POST',body:{confirm:'yes'}})).code,400);
   const erase=await request('/api/privacy/erase-local',{method:'POST',body:{confirm:'ERASE LOCAL DATA'}});
   assert.equal(erase.code,200);assert.equal(erase.data.externalChanges,false);
   assert.equal((await request('/api/state')).data.events.length,0);
   assert.equal((await request('/api/state')).data.devices.length,0);
   assert.equal((await request('/api/health',{otherHost:'evil.local'})).code,403);
 }finally{proc.kill('SIGTERM');await sleep(150);await rm(dir,{recursive:true,force:true});}
});
