'use strict';
// Build-only verification of the installed compiled wrapper. No provider calls,
// no /data access, no credentials. The original transport is replaced by a fixture.
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {pathToFileURL}=require('node:url');
const {createForegroundGuard}=require('/app/foreground-cooldown.cjs');
const file='/usr/local/lib/node_modules/openclaw/dist/provider-transport-fetch-CgnF5gpV.mjs';
const source=fs.readFileSync(file,'utf8');
const prefix='function buildGuardedModelFetch(model,...args){';
const expected=prefix+'return jarvisForegroundGuard.wrapModelFetch(model,jarvisOriginalGuardedModelFetch(model,...args));}';
assert.equal(source.split(prefix).length,2);
assert.ok(source.includes(expected));
assert.ok(source.includes('import jarvisForegroundGuard from "/app/foreground-cooldown.cjs";'));
const segment=source.slice(source.indexOf(prefix),source.indexOf(prefix)+expected.length);
const model={provider:'openrouter',id:'openrouter/free'};
const url='https://openrouter.ai/api/v1/chat/completions';
const init={method:'POST',body:JSON.stringify({model:'openrouter/free',messages:[]})};
test('installed compiled module imports without calling transport',async()=>{
 const mod=await import(pathToFileURL(file).href);
 assert.ok(Object.values(mod).some(value=>value?.name==='buildGuardedModelFetch'));
});
test('actual compiled wrapper delegates to guard and persists rate limits',async()=>{
 let calls=0,deadline=0,clock=100000,admitted=false;
 const original=async(input,options)=>{
  calls++;assert.equal(input,url);assert.equal(options,init);
  return new Response(null,{status:429,headers:{'retry-after':'120.5'}});
 };
 const sandbox={
  jarvisOriginalGuardedModelFetch:(m,...args)=>{assert.equal(m,model);assert.deepEqual(args,[123,{sanitizeSse:true}]);return original;},
  jarvisForegroundGuard:{wrapModelFetch:(m,fn)=>createForegroundGuard({
   model:m,original:fn,now:()=>clock,
   store:{read:async()=>deadline,record:async value=>{deadline=value;return true;}},
   acquire:async()=>{assert.equal(admitted,false);admitted=true;return async safe=>{assert.equal(safe,true);admitted=false;};}
  })}
 };
 vm.runInNewContext(segment+'\nthis.build=buildGuardedModelFetch;',sandbox,{timeout:1000});
 const transport=sandbox.build(model,123,{sanitizeSse:true});
 assert.equal((await transport(url,init)).status,429);
 assert.equal(deadline,220500);
 await assert.rejects(transport(url,init),/admission blocked/);
 await assert.rejects(transport(url,{...init,body:'{"model":"openrouter/auto"}'}),/admission blocked/);
 assert.equal(calls,1);
 clock=deadline;
 assert.equal((await transport(url,init)).status,429);
 assert.equal(calls,2);
});

// Use the actual installed SDK's serialization and stream parser, not handcrafted
// fetch arguments. The upstream network is deliberately replaced; no real API key.
test('installed SDK exercises free request, durable cooldown, and streamed text',{timeout:15000},async t=>{
 const {createRequire}=require('node:module');
 const localRequire=createRequire('/usr/local/lib/node_modules/openclaw/package.json');
 const sdk=localRequire('openai');
 const OpenAI=sdk.OpenAI??sdk.default??sdk;
 const {createAdmission}=require('/app/foreground-cooldown.cjs');
 // The Dockerfile copies these dependencies after the compiled-wrapper test.
 // The actual fixture is run again after those files are installed.
 const {createCooldownStore}=require('/app/cloudflare-workers-ai-client.cjs');
 const fsPromises=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
 const root=await fsPromises.mkdtemp(path.join(os.tmpdir(),'jarvis-sdk-fixture-'));
 t.after(()=>fsPromises.rm(root,{recursive:true,force:true}));
 const cooldown=path.join(root,'cooldown'),admission=path.join(root,'admission');
 await fsPromises.mkdir(cooldown,{mode:0o700});
 await fsPromises.mkdir(admission,{mode:0o700});
 let calls=0,clock=100000;
 const makeClient=()=>new OpenAI({apiKey:'fixture-not-a-real-key',baseURL:'https://openrouter.ai/api/v1',maxRetries:0,
  fetch:createForegroundGuard({model,now:()=>clock,
   store:createCooldownStore({directory:cooldown}),acquire:createAdmission(admission),
   original:async(input,options)=>{
    calls++;
    assert.equal(String(input),url);
    assert.equal(JSON.parse(options.body).model,'openrouter/free');
    if(calls===1)return new Response(JSON.stringify({error:{message:'fixture quota',code:429}}),{status:429,headers:{'content-type':'application/json','retry-after':'120.5'}});
    const chunk=(delta,finish_reason)=>({id:'fixture',object:'chat.completion.chunk',created:1,model:'openrouter/free',choices:[{index:0,delta,finish_reason}]});
    return new Response('data: '+JSON.stringify(chunk({role:'assistant',content:'JARVIS FIXTURE'},null))+'\n\ndata: '+JSON.stringify(chunk({},'stop'))+'\n\ndata: [DONE]\n\n',{headers:{'content-type':'text/event-stream'}});
   }})
 });
 const request={model:'openrouter/free',messages:[{role:'user',content:'fixture'}],stream:true};
 await assert.rejects(makeClient().chat.completions.create(request),e=>e.status===429);
 const deadline=await createCooldownStore({directory:cooldown}).read();
 assert.equal(deadline,220500);
 await assert.rejects(makeClient().chat.completions.create(request));
 assert.equal(calls,1);
 clock=deadline;
 const stream=await makeClient().chat.completions.create(request);
 let visible='',finish;
 for await(const chunk of stream){
  visible+=chunk.choices[0]?.delta?.content??'';
  if(chunk.choices[0]?.finish_reason)finish=chunk.choices[0].finish_reason;
 }
 assert.equal(visible,'JARVIS FIXTURE');
 assert.equal(finish,'stop');
 assert.equal(calls,2);
});
