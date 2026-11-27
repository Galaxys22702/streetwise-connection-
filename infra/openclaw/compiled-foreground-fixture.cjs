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
