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
