'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {createProbeGuard, isFreeRoute, retryAfterMs} = require('../infra/openclaw/probe-gate-166.cjs');
const {patch} = require('../infra/openclaw/patch-pinned-mjs-166.cjs');

test('only OpenRouter free route is controlled', () => {
  for (const model of ['free','openrouter/free','openrouter/openrouter/free']) assert.equal(isFreeRoute({provider:'openrouter',model}),true);
  for (const model of ['openrouter/auto','openrouter/openrouter/auto','other:free','paid','other/free']) assert.equal(isFreeRoute({provider:'openrouter',model}),false);
  assert.equal(isFreeRoute({provider:'google',model:'free'}),false);
});
test('Retry-After parses seconds and dates and bounds both', () => {
 const t=Date.parse('2026-11-21T00:00:00Z');
 assert.equal(retryAfterMs('120',t),120000);
 assert.equal(retryAfterMs('Sat, 21 Nov 2026 00:02:00 GMT',t),120000);
 assert.equal(retryAfterMs('99999999',t),86400000);
 assert.equal(retryAfterMs('0',t),60000);
 assert.equal(retryAfterMs('invalid',t),null);
});
test('429 blocks attempts until expiry with zero mock transport sends', async()=>{
 let now=1000, calls=0;const g=createProbeGuard({now:()=>now}),route={provider:'openrouter',model:'openrouter/free'};
 const send=async()=>{const ticket=g.start(route);if(!ticket.allowed)return {blocked:true};try {calls++;if(calls===1) g.onRateLimit({response:{headers:{'Retry-After':'120'}}});return {blocked:false};}finally{g.release(ticket);}};
 assert.equal((await send()).blocked,false);
 for(let i=0;i<10;i++)assert.equal((await send()).blocked,true);
 assert.equal(calls,1);
 now+=119999;assert.equal((await send()).blocked,true);assert.equal(calls,1);
 now++;assert.equal((await send()).blocked,false);assert.equal(calls,2);
});
test('concurrent probe is blocked without releasing the real in-flight ticket',()=>{
 const g=createProbeGuard(),route={provider:'openrouter',model:'openrouter/free'};
 const first=g.start(route),second=g.start(route);assert.equal(first.allowed,true);
 assert.equal(second.allowed,false);assert.equal(second.reason,'busy');
 g.release(second);assert.equal(g.start(route).allowed,false);
 g.release(first);assert.equal(g.start(route).allowed,true);
});
test('repeat rate limits extend but cannot shorten cooldown',()=>{
 let t=0;const g=createProbeGuard({now:()=>t});
 g.onRateLimit({headers:{'retry-after':'3600'}});t=1000;g.onRateLimit({headers:{'retry-after':'60'}});
 assert.equal(g.remainingMs(),3_599_000);
});
test('missing Retry-After defaults to 15 minutes',()=>{
 let t=5_000;const g=createProbeGuard({now:()=>t});
 assert.equal(g.onRateLimit({status:429}),900000);
});
test('non-free requests are unmodified by guard',()=>{
 const g=createProbeGuard();
 assert.deepEqual(g.start({provider:'openrouter',model:'openrouter/auto'}),{controlled:false,allowed:true});
});
const fixture = `//#region src/system-agent/setup-inference-turn.ts
async function runSetupInferenceTurn(params) {
\tconst { route, deps } = params;
\tconst runId = "test";
\tconst sessionKey = "test";
\tconst failed = (status,error)=>({ok:false,status,error});
\tconst preparedRunAdmission = {close(){}};
\ttry {
\t\tif (params.signal?.aborted) throw new SetupInferenceCancelledError();
\t\tregisterHiddenSetupInferenceProbeRun(runId, route.agentId, sessionKey);
\t\tresult = await runSetupInferenceProbeWork(runEmbedded, {
\t\t\t\tlane: \`session:probe-setup-inference:\${route.provider}\`,
\t\t\t\tthinkLevel: "off",
\t\t\t\treasoningLevel: "off",
\t\t\t\tverboseLevel: "off"
\t\t});
\t} catch (error) {
\t\tconst described = describeSetupInferenceError(error, route);
\t\treturn failed(described.status, described.error);
\t} finally {
\t\tpreparedRunAdmission.close();
\t}
}
`;
test('compiled probe is changed only at a unique pinned block',()=>{
 const result=patch(fixture);
 assert.match(result,/thinkLevel: issue166ProbeGate.isFreeRoute\(route\) \? "minimal" : "off"/);
 assert.match(result,/reasoningLevel: issue166ProbeGate.isFreeRoute\(route\) \? "minimal" : "off"/);
 assert.match(result,/issue166ProbeGate.onRateLimit\(error\)/);
 assert.match(result,/issue166ProbeGate.release\(issue166Ticket\)/);
 assert.match(result,/verboseLevel: "off"/);
 assert.equal(result.match(/issue166RuntimeGuard/g).length,2);
});
test('tampered or duplicate source cannot be patched',()=>{
 assert.throws(()=>patch(fixture.replace('thinkLevel: "off"','thinkLevel: "low"')),/thinking fields/);
 assert.throws(()=>patch(fixture+fixture),/source region/);
 assert.throws(()=>patch(patch(fixture)),/already modified/);
});
test('CLI check mode leaves files unchanged and patch mode rejects unexpected version',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'issue166-patcher-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const file=path.join(root,'setup-inference-turn-test.mjs');
 fs.writeFileSync(file,fixture);
 const old=fs.readFileSync(file);
 const program=path.join(__dirname,'../infra/openclaw/patch-pinned-mjs-166.cjs');
 let result=spawnSync(process.execPath,[program,'--check',root],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 assert.deepEqual(fs.readFileSync(file),old);
 result=spawnSync(process.execPath,[program,root],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 assert.notDeepEqual(fs.readFileSync(file),old);
 result=spawnSync(process.execPath,[program,root],{encoding:'utf8'});
 assert.notEqual(result.status,0);
});