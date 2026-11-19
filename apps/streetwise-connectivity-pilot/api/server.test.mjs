import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { buildServer, cidrMatcher } from './server.mjs';

const origin = 'https://streetwiseconnection.com';
const localPlan = 'vegas-pilot';
const sampleCode = 'unit-test-code'.repeat(3);
const input = { email:'member@example.test',zip:'89109',plan:localPlan };
const settings = {
  GIGS_ESIM_ENABLED:'true',GIGS_TOKEN:'fixture',GIGS_PROJECT:'pilot',GIGS_SUBSCRIPTION_ID:'sub_fixture',
  GIGS_USER_ID:'usr_fixture',GIGS_PLAN_ID:'pln_fixture',PILOT_EMAIL:input.email,PILOT_ZIP:input.zip,
  PILOT_PLAN:localPlan,PILOT_ACCESS_CODE:sampleCode
};
async function fixture(t, env, provider) {
  const server = buildServer(env,provider,()=>1_800_000_000_000).listen(0,'127.0.0.1');
  await once(server,'listening');
  t.after(() => server.close());
  return (path,init={})=>fetch('http://127.0.0.1:' + server.address().port + path,init);
}
function activate(ask, body = input, code = sampleCode) {
  return ask('/v1/esim',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Pilot-Code':code},
    body:JSON.stringify(body)});
}
test('matches configured IPv4/IPv6 ranges and ignores proxy headers unless explicitly trusted', async t => {
  const onNetwork = cidrMatcher('192.0.2.0/24,2001:db8::/32');
  assert.equal(onNetwork('::ffff:192.0.2.8'),true);
  assert.equal(onNetwork('2001:db8::1'),true);
  assert.equal(onNetwork('192.0.3.1'),false);
  assert.throws(()=>cidrMatcher('192.0.2.0/40'));
  for(const trusted of ['false','true']) {
    const ask = await fixture(t,{CBRS_CIDRS:'192.0.2.0/24',TRUST_LOOPBACK_PROXY:trusted});
    const response=await ask('/v1/check-network',{headers:{'X-Real-IP':'192.0.2.8','X-Forwarded-For':'192.0.2.8'}});
    assert.deepEqual(await response.json(),{is_cbrs:trusted==='true'});
  }
});
test('defaults TURN and eSIM off and never calls a provider in that mode', async t=>{
  const ask=await fixture(t,{},()=>assert.fail('unexpected provider call'));
  assert.deepEqual(await (await ask('/v1/status')).json(),{turn_ready:false,esim_ready:false});
  assert.equal((await ask('/v1/turn',{method:'POST',headers:{Origin:origin}})).status,503);
  assert.equal((await activate(ask)).status,503);
});
test('issues short-lived TURN credentials only for the approved origin and limits requests', async t=>{
  const secret='synthetic-test-secret'.repeat(3);
  const ask=await fixture(t,{TURN_SHARED_SECRET:secret,TURN_URLS:'turn:turn.example.test:3478?transport=udp'});
  const open=site=>ask('/v1/turn',{method:'POST',headers:{Origin:site}});
  assert.equal((await open('https://other.example.test')).status,403);
  const response=await open(origin);
  const [server]=(await response.json()).iceServers;
  assert.equal(Number(server.username.split(':')[0]),1_800_000_180);
  assert.equal(server.credential,createHmac('sha1',secret).update(server.username).digest('base64'));
  assert.equal(response.headers.get('access-control-allow-origin'),origin);
  for(let i=0;i<3;i++) assert.equal((await open(origin)).status,200);
  assert.equal((await open(origin)).status,429);
});
test('returns only the real provider field for the authorized active subscription and rejects foreign install URLs', async t=>{
  let pathCount=0;
  let installed='https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=LPA%3A1%24example.test%24fixture';
  const ask=await fixture(t,settings,async (url,options)=>{
    pathCount++;
    assert.equal(options.redirect,'error');
    assert.ok(!options.method);
    if(url.endsWith('/subscriptions/sub_fixture')) return Response.json({
      id:'sub_fixture',status:'active',plan:{id:'pln_fixture'},user:'usr_fixture',sim:{id:'sim_fixture'}
    });
    assert.ok(url.endsWith('/sims/sim_fixture/credentials'));
    return Response.json({sim:'sim_fixture',iosInstallUrl:installed,activationCode:'fixture'});
  });
  assert.equal((await activate(ask,input,'wrong')).status,403);
  assert.equal((await activate(ask,{...input,zip:'00000'})).status,403);
  assert.equal(pathCount,0);
  const result=await activate(ask);
  assert.equal(result.headers.get('cache-control'),'no-store');
  assert.deepEqual(await result.json(),{smdp_url:installed});
  installed=installed.replace('esimsetup.apple.com','example.test');
  assert.equal((await activate(ask)).status,409);
  assert.equal(pathCount,4);
});
