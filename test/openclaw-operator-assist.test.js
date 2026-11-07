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
    'JARVIS, report your operational status and respond with JARVIS ONLINE.',
    '--model', 'openrouter/openrouter/free',
    '--thinking', 'minimal', '--timeout', '90', '--json'
  ]);
  const summary = assist.summarizeReply('model openrouter/openrouter/free JARVIS ONLINE\nsk-or-v1-secretvalue');
  assert.equal(summary.online, true);
  assert.equal(summary.free, true);
  assert.equal(summary.paidAuto, false);
  assert.deepEqual(summary.models, ['openrouter/openrouter/free']);
  assert.equal(JSON.stringify(summary).includes('secretvalue'), false);
  const nested = assist.summarizeReply('openrouter/thinkingmachines/inkling:free');
  assert.equal(nested.free, true);
  assert.equal(nested.paidAuto, false);
  assert.deepEqual(nested.models, ['openrouter/thinkingmachines/inkling:free']);
  const paid = assist.summarizeReply('openrouter/openrouter/auto');
  assert.equal(paid.paidAuto, true);
  assert.equal(paid.free, false);
});
