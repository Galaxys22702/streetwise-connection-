import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const assist = createRequire(import.meta.url)('../infra/openclaw/approve-operator.cjs');

test('operator assist does nothing unless a flag is exactly 1', async () => {
  let calls = 0;
  const report = await assist.assist({ JARVIS_APPROVE_LOCAL_OPERATOR: '0', JARVIS_STATUS_PROBE: '' }, {
    ready: async () => { calls += 1; return true; },
    run: async () => { throw new Error('should not run'); }
  });
  assert.deepEqual(report, { reason: 'disabled' });
  assert.equal(calls, 0);
});

test('only pending operator UUIDs are approved, and node requests are left alone', () => {
  const ids = assist.selectOperatorRequests({
    pending: [
      { requestId: '46bce301-092d-4bee-bbae-1e5a64ce0986', role: 'operator' },
      { requestId: '46bce301-092d-4bee-bbae-1e5a64ce0987', role: 'node' },
      { requestId: 'not-a-uuid', role: 'operator' },
      { role: 'operator' },
      { requestId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', role: 'operator', clientId: 'control-ui' },
      { requestId: 'cccccccc-bbbb-cccc-dddd-eeeeeeeeeeee', role: 'operator', roles: ['node'] },
      { requestId: 'bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee', roles: ['operator'] }
    ]
  });
  assert.deepEqual(ids, [
    '46bce301-092d-4bee-bbae-1e5a64ce0986',
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee'
  ]);
  assert.deepEqual(assist.selectOperatorRequests({ result: { pending: [
    { requestId: 'dddddddd-bbbb-cccc-dddd-eeeeeeeeeeee', role: 'operator' }
  ] } }), ['dddddddd-bbbb-cccc-dddd-eeeeeeeeeeee']);
});

test('approval uses the exact request id and ignores an unreadable list', async () => {
  const calls = [];
  const approved = await assist.approvePending(async args => {
    calls.push(args);
    if (args[0] === 'devices' && args[1] === 'list') {
      return { code: 0, out: 'log line\n' + JSON.stringify({ pending: [
        { requestId: '46bce301-092d-4bee-bbae-1e5a64ce0986', role: 'operator' },
        { requestId: '11111111-2222-3333-4444-555555555555', role: 'node' }
      ] }) };
    }
    return { code: 0, out: '{"ok":true}' };
  });
  assert.deepEqual(approved, ['46bce301-092d-4bee-bbae-1e5a64ce0986']);
  assert.deepEqual(calls[1], ['devices', 'approve', '46bce301-092d-4bee-bbae-1e5a64ce0986', '--json']);
  assert.deepEqual(await assist.approvePending(async () => ({ code: 0, out: 'no json here' })), []);
});

test('the status probe asks for minimal thinking and reports free routing without secrets', async () => {
  assert.deepEqual(assist.probeArgs(), [
    'agent', '--agent', 'main', '--session-key', 'jarvis-status-probe', '--message',
    'Reply with exactly JARVIS ONLINE.',
    '--model', 'openrouter/openrouter/free',
    '--thinking', 'minimal', '--timeout', '90', '--json'
  ]);
  const reply = { payloads: [{ text: 'JARVIS ONLINE' }], meta: { agentMeta: { provider: 'openrouter', model: 'openrouter/free' } } };
  const json = (result, status = 'ok') => JSON.stringify({ status, result });
  assert.deepEqual(assist.summarizeReply(json(reply)), { online: true, free: true, paidAuto: false, models: ['openrouter/openrouter/free'] });
  for (const output of ['{malformed', 'Reply with exactly JARVIS ONLINE. openrouter/openrouter/free',
    json(reply, 'error'), json({ ...reply, payloads: [] }), json({ ...reply, meta: {} }),
    json({ ...reply, payloads: [{ text: 'JARVIS ONLINE', isError: true }] }),
    json({ ...reply, meta: { agentMeta: { provider: 'other', model: 'openrouter/free' } } })]) {
    assert.equal(assist.summarizeReply(output).online, false);
  }
  assert.equal(assist.summarizeReply(json(reply), 1).online, false);
  const auto = assist.summarizeReply(json({ ...reply, meta: { agentMeta: { provider: 'openrouter', model: 'openrouter/auto' } } }));
  assert.equal(auto.online, false);
  assert.equal(auto.paidAuto, true);
});


test('idle operator polling logs at most once per hour without suppressing future checks', () => {
  let now = 0;
  const gate = assist.createNoPendingLogGate({ now: () => now });
  assert.equal(gate(), true);
  now = 15_000;
  assert.equal(gate(), false);
  now = 3_599_999;
  assert.equal(gate(), false);
  now = 3_600_000;
  assert.equal(gate(), true);
  now = 3_615_000;
  assert.equal(gate(), false);
});

test('probe-only startup waits for readiness and sends at most one request', async () => {
  for (const readyAt of [1, 3, Infinity]) {
    let checks = 0, calls = 0;
    await assist.main({ JARVIS_STATUS_PROBE: '1' }, {
      ready: async () => ++checks >= readyAt,
      sleep: async () => {},
      run: async () => { calls++; return { code: 1, out: 'rate limited' }; }
    });
    assert.equal(checks, Math.min(12, readyAt));
    assert.equal(calls, Number(readyAt !== Infinity));
  }
});
