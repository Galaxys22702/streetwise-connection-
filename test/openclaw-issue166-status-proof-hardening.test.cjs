/** Issue #166: strict free startup reply evidence. Synthetic fixtures only, no provider calls. */
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const a=require('../infra/openclaw/approve-operator.cjs');
const base={
 payloads:[{text:'JARVIS ONLINE'}],
 meta:{agentMeta:{provider:'openrouter',model:'openrouter/free'}}
};
const msg=(value,status='ok')=>JSON.stringify({status,result:value});
const cases=[
 ['valid completed',msg(base),0,true],
 ['valid completed status',msg(base,'completed'),0,true],
 ['bad exit',msg(base),1,false],
 ['top level error without result',JSON.stringify({...base,status:'error'}),0,false],
 ['top level pending without result',JSON.stringify({...base,status:'pending'}),0,false],
 ['explicit error with result',msg(base,'error'),0,false],
 ['in-flight with result',msg(base,'in_flight'),0,false],
 ['payload error after success',msg({...base,payloads:[...base.payloads,{text:'failed',isError:true}]}),0,false],
 ['extra assistant output',msg({...base,payloads:[{text:'JARVIS ONLINE'},{text:'extra output'}]}),0,false],
 ['incomplete finish length',msg({...base,meta:{...base.meta,finishReason:'length'}}),0,false],
 ['incomplete stop timeout',msg({...base,meta:{...base.meta,stopReason:'timeout'}}),0,false],
 ['aborted',msg({...base,meta:{...base.meta,aborted:true}}),0,false],
 ['yielded',msg({...base,meta:{...base.meta,yielded:true}}),0,false],
 ['fallback attempts',msg({...base,meta:{...base.meta,agentMeta:{...base.meta.agentMeta,fallbackAttempts:[{provider:'openrouter',model:'paid-model'}]}}}),0,false],
 ['error result',msg({...base,error:{code:429}}),0,false],
 ['missing payloads',msg({...base,payloads:[]}),0,false],
 ['hidden payload',msg({...base,payloads:[{text:'JARVIS ONLINE',visible:false}]}),0,false],
 ['reasoning payload',msg({...base,payloads:[{text:'JARVIS ONLINE',isReasoning:true}]}),0,false],
 ['other provider',msg({...base,meta:{agentMeta:{provider:'other',model:'openrouter/free'}}}),0,false],
 ['paid Auto',msg({...base,meta:{agentMeta:{provider:'openrouter',model:'openrouter/auto'}}}),0,false],
 ['no model metadata',msg({...base,meta:{}}),0,false],
 ['pairing error as log prefix','pairing required\n'+msg(base),0,false],
 ['429 error as log prefix','HTTP 429 Too Many Requests\n'+msg(base),0,false],
 ['400 error as log prefix','HTTP 400 Unsupported thinking\n'+msg(base),0,false],
 ['plain echo','Reply with exactly JARVIS ONLINE. openrouter/openrouter/free',0,false],
 ['bad/malformed JSON','{malformed',0,false],
 ['malformed fallback metadata',msg({...base,meta:{...base.meta,agentMeta:{...base.meta.agentMeta,fallbackAttempts:{paid:true}}}}),0,false],
 ['truthy string isError',msg({...base,payloads:[{text:'JARVIS ONLINE',isError:'true'}]}),0,false],
 ['generic error prefix','ERROR: provider request failed\n'+msg(base),0,false],
 ['invalid top-level object',JSON.stringify(base),0,false],
 ['whitespace in exact reply',msg({...base,payloads:[{text:' JARVIS ONLINE\n'}]}),0,true]
];
for(const [title,output,code,expected] of cases){
 test('completion: '+title,()=>{
  assert.equal(a.summarizeReply(output,code).online,expected);
 });
}
test('statusProbe rejects pairing even when result envelope claims success',async()=>{
  let called=0;
  const q=await a.statusProbe(async()=>{called++;return {code:0,out:'pairing required\n'+msg(base)};});
  assert.equal(called,1);
  assert.equal(q.online,false);
  assert.equal(q.pairingRequired,true);
});
test('combined operator + probe never retries AI automatically after pairing required',async()=>{
 let calls=0, lists=0;
 try{
  await a.main({JARVIS_APPROVE_LOCAL_OPERATOR:'1',JARVIS_STATUS_PROBE:'1'},{
    ready:async()=>true,
    sleep:async()=>{throw Error('stop fixture');},
    run:async(args)=>{
      if(args[0]==='agent'){calls++;return {code:1,out:'pairing required'};}
      if(args[0]==='devices' && args[1]==='list'){lists++;return {code:0,out:JSON.stringify({pending:[]})};}
      return {code:1,out:'unexpected'};
    }
  });
 }catch(e){if(e.message!=='stop fixture')throw e;}
 assert.equal(calls,1);
 assert.equal(lists,2);
});
test('probe-only readiness waits and attempts one inference',async()=>{
 let checks=0,calls=0;
 await a.main({JARVIS_STATUS_PROBE:'1'},{
    ready:async()=>++checks===3,
    sleep:async()=>{},
    run:async()=>{calls++;return {code:1,out:'HTTP 429'};}
 });
 assert.equal(checks,3);
 assert.equal(calls,1);
});
test('probe-only permanent lack of readiness exits with zero calls after twelve checks',async()=>{
 let checks=0,calls=0;
 await a.main({JARVIS_STATUS_PROBE:'1'},{
    ready:async()=>{checks++;return false;},
    sleep:async()=>{},
    run:async()=>{calls++;throw Error('must never call');}
 });
 assert.equal(checks,12);
 assert.equal(calls,0);
});
test('an error JSON log followed by success JSON cannot produce ONLINE',()=>{
 const bad=JSON.stringify({status:'error',message:'provider offline'})+'\n'+msg(base);
 assert.equal(a.summarizeReply(bad,0).online,false);
});
test('a prior pending JSON log followed by success JSON also fails closed',()=>{
 const bad=JSON.stringify({status:'pending'})+'\n'+msg(base);
 assert.equal(a.summarizeReply(bad,0).online,false);
});
const request = { role:'operator', requestId:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' };
test('a nonzero device-list exit must never approve a request',async()=>{
 let approves=0;
 const found=await a.approvePending(async args=>{
   if(args[1]==='list') return {code:1,out:JSON.stringify({pending:[request]})};
   approves++;return {code:0,out:'{}'};
 });
 assert.equal(approves,0);assert.deepEqual(found,[]);
});
test('an error-status device list never approves even with exit code zero',async()=>{
 let approves=0;
 const found=await a.approvePending(async args=>{
   if(args[1]==='list') return {code:0,out:JSON.stringify({status:'error',pending:[request]})};
   approves++;return {code:0,out:'{}'};
 });
 assert.equal(approves,0);assert.deepEqual(found,[]);
});
test('zero-exit approval returning structured error is not success',async()=>{
 let approves=0;
 const found=await a.approvePending(async args=>{
   if(args[1]==='list') return {code:0,out:JSON.stringify({pending:[request]})};
   approves++;return {code:0,out:JSON.stringify({status:'error',message:'denied'})};
 });
 assert.equal(approves,1);assert.deepEqual(found,[]);
});
test('valid successful operator-only approval still works',async()=>{
 let approves=0;
 const found=await a.approvePending(async args=>{
   if(args[1]==='list') return {code:0,out:JSON.stringify({pending:[request,{role:'node',requestId:'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'}]})};
   approves++;return {code:0,out:JSON.stringify({status:'ok'})};
 });
 assert.equal(approves,1);assert.deepEqual(found,[request.requestId]);
});
