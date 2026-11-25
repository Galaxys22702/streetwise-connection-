'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createAdmission,createForegroundGuard,deadlineFromResponse,wrapModelFetch}=require('./foreground-cooldown.cjs');
const model={provider:'openrouter',id:'openrouter/free'};
const url='https://openrouter.ai/api/v1/chat/completions';
const init={method:'POST',body:JSON.stringify({model:'openrouter/free',messages:[]})};
function fixture(options={}){
 const order=[];
 const store={read:async()=>options.deadline??0,record:async until=>{order.push(['record',until]);return options.save!==false;}};
 const original=async(input,request)=>{order.push('network');assert.equal(input,url);assert.equal(request,init);return options.response??new Response('ok');};
 const acquire=async()=>{order.push('acquire');return async safe=>{order.push(['finish',safe]);};};
 return {order,guard:createForegroundGuard({model,original,store,acquire,now:()=>100000,...options.override})};
}
test('active cooldown blocks network and releases admission',async()=>{
 const {guard,order}=fixture({deadline:200000});
 await assert.rejects(guard(url,init),/admission blocked/);
 assert.deepEqual(order,['acquire',['finish',true]]);
});
test('429 persisted before releasing admission; preserves response',async()=>{
 const response=new Response('rate limited',{status:429,headers:{'retry-after':'120'}});
 const {guard,order}=fixture({response});
 assert.equal(await guard(url,init),response);
 assert.deepEqual(order,['acquire','network',['record',220000],['finish',true]]);
});
test('failed persistence keeps admission blocked',async()=>{
 const {guard,order}=fixture({save:false,response:new Response('rate limited',{status:429})});
 await assert.rejects(guard(url,init),/admission blocked/);
 assert.deepEqual(order,['acquire','network',['record',1000000],['finish',false]]);
});
test('unknown storage and wrong outbound route never reach provider',async()=>{
 const {guard,order}=fixture({override:{store:{read:async()=>null}}});
 await assert.rejects(guard(url,init),/admission blocked/);
 await assert.rejects(guard('https://example.invalid/',init),/admission blocked/);
 await assert.rejects(guard(url,{...init,body:'{"model":"openrouter/auto"}'}),/admission blocked/);
 assert.deepEqual(order,['acquire',['finish',false]]);
});
test('ordinary response unchanged; disabled and other providers untouched',async()=>{
 const response=new Response('data: fixture\n\n');
 const {guard,order}=fixture({response});
 assert.equal(await guard(url,init),response);
 assert.deepEqual(order,['acquire','network',['finish',true]]);
 const original=()=>{};
 const old=process.env.JARVIS_FOREGROUND_COOLDOWN;
 try{
  delete process.env.JARVIS_FOREGROUND_COOLDOWN;
  assert.equal(wrapModelFetch(model,original),original);
  process.env.JARVIS_FOREGROUND_COOLDOWN='1';
  assert.equal(wrapModelFetch({provider:'other'},original),original);
 }finally{if(old===undefined)delete process.env.JARVIS_FOREGROUND_COOLDOWN;else process.env.JARVIS_FOREGROUND_COOLDOWN=old;}
});
test('retry-after never shortened; invalid overflow blocks',()=>{
 assert.equal(deadlineFromResponse(new Response(null,{status:429,headers:{'retry-after':'172800'}}),100000),172900000);
 assert.equal(deadlineFromResponse(new Response(null,{status:429,headers:{'retry-after':'999999999999999999999'}}),100000),null);
});
test('durable admission is exclusive and survives recreation on failure',{skip:process.platform!=='linux'},async t=>{
 const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'jarvis-admission-'));
 t.after(()=>fs.rm(directory,{recursive:true,force:true}));
 const first=await createAdmission(directory)();
 assert.equal(typeof first,'function');
 assert.equal(await createAdmission(directory)(),null);
 await first(true);
 const second=await createAdmission(directory)();
 assert.equal(typeof second,'function');
 await second(false);
 assert.equal(await createAdmission(directory)(),null);
});
