import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const assist = createRequire(import.meta.url)('../infra/openclaw/approve-operator.cjs');
const NAME = 'Win-a1b2c3d4e5f60789';
const DEVICE = 'device-win-001';
const OTHER = 'device-win-002';
const NODE_REQUEST = '46bce301-092d-4bee-bbae-1e5a64ce0988';
const COMMAND_REQUEST = '46bce301-092d-4bee-bbae-1e5a64ce0999';

function windowsEnv(extra = {}) {
  return {
    JARVIS_APPROVE_WINDOWS_NODE: '1',
    JARVIS_NODE_DISPLAY_NAME: NAME,
    ...extra
  };
}

function pendingDevice(extra = {}) {
  return {
    requestId: '46bce301-092d-4bee-bbae-1e5a64ce0987',
    role: 'node',
    displayName: NAME,
    platform: 'win32',
    deviceId: DEVICE,
    ...extra
  };
}

test('operator assist does nothing unless a flag is exactly 1', async () => {
  let calls = 0;
  const report = await assist.assist({ JARVIS_APPROVE_LOCAL_OPERATOR: '0', JARVIS_STATUS_PROBE: '', JARVIS_APPROVE_WINDOWS_NODE: '0' }, {
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
});

test('a windows node must match the private name, win32, and one saved device', () => {
  const pending = { pending: [
    pendingDevice(),
    pendingDevice({ requestId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', platform: 'darwin', deviceId: OTHER }),
    pendingDevice({ requestId: 'bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee', displayName: 'Other-Laptop-Name', deviceId: OTHER }),
    pendingDevice({ requestId: 'cccccccc-bbbb-cccc-dddd-eeeeeeeeeeee', roles: ['node', 'operator'], deviceId: OTHER })
  ] };
  assert.deepEqual(assist.selectWindowsNodeRequests(pending, { name: NAME }), [
    { requestId: '46bce301-092d-4bee-bbae-1e5a64ce0987', deviceId: DEVICE }
  ]);
  assert.deepEqual(assist.selectWindowsNodeRequests(pending, { name: 'short' }), []);
  assert.deepEqual(assist.selectWindowsNodeRequests(pending, { name: NAME, pinnedDeviceId: OTHER }), []);
});

test('camera and screen commands are not granted', () => {
  const wide = assist.selectWindowsCommandRequests({ pending: [{
    requestId: COMMAND_REQUEST,
    displayName: NAME,
    commands: ['system.run', 'camera.snap']
  }] }, { name: NAME });
  assert.equal(wide[0].allowed, false);
  const narrow = assist.selectWindowsCommandRequests({ pending: [{
    requestId: COMMAND_REQUEST,
    displayName: NAME,
    commands: ['system.run', 'system.which']
  }] }, { name: NAME });
  assert.equal(narrow[0].allowed, true);
});

test('windows pairing approves one device and requires each later command', async () => {
  const calls = [];
  let pinned = '';
  const state = {
    read: () => pinned,
    write: id => { pinned = id; }
  };
  const run = async (args, _timeout, input) => {
    calls.push({ args, input });
    if (args[0] === 'devices' && args[1] === 'list') {
      return { code: 0, out: JSON.stringify({ pending: [pendingDevice()] }) };
    }
    if (args[0] === 'nodes' && args[1] === 'pending') {
      return { code: 0, out: JSON.stringify({ pending: [{
        requestId: COMMAND_REQUEST,
        displayName: NAME,
        commands: ['system.run']
      }] }) };
    }
    return { code: 0, out: '{"ok":true}' };
  };
  const report = await assist.approveWindowsNode(run, windowsEnv(), { state });
  assert.equal(report.reason, 'paired');
  assert.equal(pinned, DEVICE);
  assert.deepEqual(calls[1].args, ['devices', 'approve', '46bce301-092d-4bee-bbae-1e5a64ce0987', '--json']);
  assert.deepEqual(calls[3].args, ['nodes', 'approve', COMMAND_REQUEST, '--json']);
  assert.deepEqual(calls[4].args.slice(0, 4), ['approvals', 'set', '--node', NAME]);
  assert.equal(JSON.parse(calls[4].input).defaults.ask, 'always');
  const second = await assist.approveWindowsNode(async args => {
    if (args[0] === 'devices') {
      return { code: 0, out: JSON.stringify({ pending: [pendingDevice({ deviceId: OTHER, requestId: NODE_REQUEST })] }) };
    }
    throw new Error('should not approve a second laptop');
  }, windowsEnv(), { state });
  assert.equal(second.reason, 'no_matching_device');
});

test('a rejected command policy removes the node command surface', async () => {
  const calls = [];
  const report = await assist.approveWindowsNode(async (args) => {
    calls.push(args);
    if (args[0] === 'devices' && args[1] === 'list') {
      return { code: 0, out: JSON.stringify({ pending: [pendingDevice()] }) };
    }
    if (args[0] === 'nodes' && args[1] === 'pending') {
      return { code: 0, out: JSON.stringify({ pending: [{
        requestId: COMMAND_REQUEST,
        displayName: NAME,
        commands: ['system.run']
      }] }) };
    }
    if (args[0] === 'approvals') return { code: 1, out: 'unsupported' };
    return { code: 0, out: '{"ok":true}' };
  }, windowsEnv(), { state: { read: () => '', write: () => {} } });
  assert.equal(report.reason, 'policy_rejected');
  assert.deepEqual(calls.at(-1).slice(0, 3), ['nodes', 'remove', '--node']);
});

test('the status probe asks for minimal thinking and reports free routing without secrets', async () => {
  const summary = assist.summarizeReply('model openrouter/openrouter/free JARVIS ONLINE\nsk-or-v1-secretvalue');
  assert.equal(summary.online, true);
  assert.equal(JSON.stringify(summary).includes('secretvalue'), false);
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

test('probe args stay pinned to the free router', () => {
  assert.deepEqual(assist.probeArgs(), [
    'agent', '--agent', 'main', '--session-key', 'jarvis-status-probe', '--message',
    'JARVIS, report your operational status and respond with JARVIS ONLINE.',
    '--model', 'openrouter/openrouter/free',
    '--thinking', 'minimal', '--timeout', '90', '--json'
  ]);
  const nested = assist.summarizeReply('openrouter/thinkingmachines/inkling:free');
  assert.equal(nested.free, true);
  assert.equal(nested.paidAuto, false);
  const paid = assist.summarizeReply('openrouter/openrouter/auto');
  assert.equal(paid.paidAuto, true);
  assert.equal(paid.free, false);
});
