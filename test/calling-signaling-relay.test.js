import test from 'node:test';
import assert from 'node:assert/strict';
import { createSignalingRelay } from '../src/services/callingSignalingRelay.js';

const callId = '11111111-1111-4111-8111-111111111111';
const alice = '22222222-2222-4222-8222-222222222222';
const bob = '33333333-3333-4333-8333-333333333333';
const offer = { callId, fromDeviceId: alice, toDeviceId: bob, type: 'offer', payload: { sdp: 'sample' } };
const authorize = async ({ principal, action, signal, deviceId, callId: requestedCallId }) =>
  action === 'send' ? principal.deviceId === signal.fromDeviceId && principal.callId === signal.callId :
    principal.deviceId === deviceId && principal.callId === requestedCallId;

test('requires explicit authorization callback', () => {
  assert.throws(() => createSignalingRelay(), /authorization_callback_required/);
});
test('authorized delivery is single-use and isolated by device and call', async () => {
  const relay = createSignalingRelay({ authorize });
  await relay.enqueue({ principal: { deviceId: alice, callId }, signal: offer });
  assert.deepEqual(await relay.receive({ principal: { deviceId: alice, callId }, deviceId: alice, callId }), []);
  assert.deepEqual(await relay.receive({ principal: { deviceId: bob, callId }, deviceId: bob, callId }), [offer]);
  assert.deepEqual(await relay.receive({ principal: { deviceId: bob, callId }, deviceId: bob, callId }), []);
});
test('rejects impersonation and unauthorized reads', async () => {
  const relay = createSignalingRelay({ authorize });
  await assert.rejects(relay.enqueue({ principal: { deviceId: bob, callId }, signal: offer }), /signaling_forbidden/);
  await assert.rejects(relay.receive({ principal: { deviceId: alice, callId }, deviceId: bob, callId }), /signaling_forbidden/);
});
test('bounds queue and expires old messages', async () => {
  let clock = 100;
  const relay = createSignalingRelay({ authorize, now: () => clock, ttlMs: 1000, maxMessages: 1 });
  await relay.enqueue({ principal: { deviceId: alice, callId }, signal: offer });
  await assert.rejects(relay.enqueue({ principal: { deviceId: alice, callId }, signal: offer }), /capacity_exceeded/);
  clock += 1001;
  assert.deepEqual(await relay.receive({ principal: { deviceId: bob, callId }, deviceId: bob, callId }), []);
});
