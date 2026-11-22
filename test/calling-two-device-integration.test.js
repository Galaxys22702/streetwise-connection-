import test from 'node:test';
import assert from 'node:assert/strict';
import { createSignalingRelay } from '../src/services/callingSignalingRelay.js';
import { createSignalingAuthorizer } from '../src/services/callingSignalingAuthorizer.js';

const callId = '11111111-1111-4111-8111-111111111111';
const alice = '22222222-2222-4222-8222-222222222222';
const bob = '33333333-3333-4333-8333-333333333333';
const devices = {
  [alice]: { ownerUserId: 'usr_alice', revokedAt: null },
  [bob]: { ownerUserId: 'usr_bob', revokedAt: null }
};
const call = { callerDeviceId: alice, calleeDeviceId: bob, state: 'ringing' };
const authorize = createSignalingAuthorizer({
  findDevice: async id => devices[id],
  findCall: async id => id === callId ? call : null
});
test('two authorized devices exchange signaling once; impersonation fails', async () => {
  const relay = createSignalingRelay({ authorize });
  const offer = { callId, fromDeviceId: alice, toDeviceId: bob, type: 'offer', payload: { sdp: 'pilot-test' } };
  await assert.rejects(relay.enqueue({ principal: { id: 'usr_bob' }, signal: offer }), /forbidden/);
  await relay.enqueue({ principal: { id: 'usr_alice' }, signal: offer });
  await assert.rejects(relay.receive({ principal: { id: 'usr_alice' }, deviceId: bob, callId }), /forbidden/);
  assert.deepEqual(await relay.receive({ principal: { id: 'usr_bob' }, deviceId: bob, callId }), [offer]);
  assert.deepEqual(await relay.receive({ principal: { id: 'usr_bob' }, deviceId: bob, callId }), []);
});
test('revoked participant cannot receive queued signaling', async () => {
  const relay = createSignalingRelay({ authorize });
  await relay.enqueue({ principal: { id: 'usr_alice' }, signal: { callId, fromDeviceId: alice, toDeviceId: bob, type: 'hangup', payload: {} } });
  devices[bob].revokedAt = new Date();
  try {
    await assert.rejects(relay.receive({ principal: { id: 'usr_bob' }, deviceId: bob, callId }), /forbidden/);
  } finally {
    devices[bob].revokedAt = null;
  }
});
