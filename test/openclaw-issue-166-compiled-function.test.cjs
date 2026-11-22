'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createProbeGuard } = require(process.env.JARVIS166_GUARD_MODULE || '../infra/openclaw/probe-gate-166.cjs');
// Requires an isolated pinned source artifact, never Railway or /data. The harness
// evaluates just the actual compiled function body and supplies test doubles.
const sourcePath = process.env.JARVIS166_COMPILED_FIXTURE;
const fixture = sourcePath ? fs.readFileSync(sourcePath, 'utf8') : null;
function getFunctionBody(code) {
 const start=code.indexOf('async function runSetupInferenceTurn(params) {');
 const next=code.indexOf('\n/** Setup owns fresh package facts',start);
 if(start<0||next<0)throw Error('Pinned source window not found; fail closed');
 return code.slice(start,next);
}
function harness(provider) {
 let clock=1000, sent=0, lastArgs=[], inFlight=[];
 const gate=createProbeGuard({now:()=>clock});
 const log=[];
 const sandbox={
   createProbeGuard:()=>gate,
   randomUUID:()=> 'fixture-id',
   Date,
   SessionManager:{inMemory:()=>({})},
   prepareSystemAgentRunAdmission:()=>({close(){}}),
   setupInferenceLog:{warn:(_msg,data)=>log.push({status:data.status})},
   registerHiddenSetupInferenceProbeRun:()=>{},
   resolveToolFreeCliSetupError:async()=>null,
   resolveSetupInferenceProfileError:()=>null,
   runSetupInferenceProbeWork:async(run,args)=>run(args),
   extractAgentRunTerminalError:result=>result?.error || null,
   extractAgentRunText:result=>result?.text,
   resolveSetupInferenceWinnerError:async()=>null,
   describeSetupInferenceError:error=>({status:error?.status===429?'rate_limit':'unknown',error:'sanitized'}),
   clearAgentRunContext:()=>{},
   fs:{rm:async()=>{}},
   path:{join:()=>'/fixture'},
   os:{tmpdir:()=>'/fixture'},
   redactSetupInferenceError:async()=> 'sanitized',
 };
 if (!fixture.includes('issue166ProbeGate')) throw Error('Compiled setup-inference chunk was not patched');
 const installed = fixture;
 // Ensure the patched function is exactly from the pinned bundle, not a recreated test function.
 const segment=getFunctionBody(installed);
 vm.runInNewContext('const issue166ProbeGate = createProbeGuard();\n'+segment+'\nthis.runProbe = runSetupInferenceTurn;',sandbox,{timeout:3000});
 const route={provider:'openrouter',model:'openrouter/free',runner:'embedded',agentId:'main',runConfig:{},agentDir:'/fixture'};
 const makeParams=()=>({route,deps:{createTempDir:async()=>'/fixture',removeTempDir:async()=>{},runEmbeddedAgent:async(args)=>{
   sent++;lastArgs.push({thinking:args.thinkLevel,reasoning:args.reasoningLevel,lane:args.lane});
   return provider({args,sent,wait:inFlight});
 }},requireExecutionOwner:false});
 return {run:()=>sandbox.runProbe(makeParams()),advance:(ms)=>clock+=ms,calls:()=>sent,args:()=>lastArgs,logs:()=>log,route,release:()=>inFlight.shift()?.()};
}
if(!fixture){ test.skip('pinned artifact not supplied',()=>{}); }
else {
 test('real patched setup-inference function: 429 -> cooldown and zero calls until expiry',async()=>{
  const h=harness(({sent})=>{if(sent===1){const err=Object.assign(new Error('429'),{status:429,response:{headers:{'Retry-After':'120'}}});throw err;}return {text:'OK'};});
  const first=await h.run();assert.equal(first.status,'rate_limit');assert.equal(h.calls(),1);
  for(let i=0;i<12;i++)assert.equal((await h.run()).status,'rate_limit');
  assert.equal(h.calls(),1);
  h.advance(119999);assert.equal((await h.run()).status,'rate_limit');
  assert.equal(h.calls(),1);
  h.advance(1);assert.equal((await h.run()).ok,true);assert.equal(h.calls(),2);
  assert.deepEqual(h.args().map(x=>x.thinking),['minimal','minimal']);
  assert.deepEqual(h.args().map(x=>x.reasoning),['minimal','minimal']);
  assert.ok(h.args().every(x=>x.lane==='session:probe-setup-inference:openrouter'));
 });
 test('real patched function: in-flight concurrency does not double-send',async()=>{
  let resolve;
  const h=harness(()=>new Promise(r=>{resolve=r;}));
  const first=h.run();
  // Let promise continuations reach the transport.
  for(let i=0;i<8;i++)await Promise.resolve();
  const second=await h.run();
  assert.equal(second.status,'rate_limit');
  assert.equal(h.calls(),1);
  resolve({text:'OK'});
  assert.equal((await first).ok,true);
 });
 test('pinned fixture contains only intended free-route minimal thinking expressions',()=>{
  assert.ok(fixture.includes('thinkLevel: issue166ProbeGate.isFreeRoute(route) ? "minimal" : "off"'));
  assert.ok(fixture.includes('reasoningLevel: issue166ProbeGate.isFreeRoute(route) ? "minimal" : "off"'));
 });
}