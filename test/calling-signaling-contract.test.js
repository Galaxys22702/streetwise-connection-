import test from 'node:test';
import assert from 'node:assert/strict';
import { createCallId, validateSignal, canTransitionCall } from '../src/services/callingSignalingContract.js';

const id1 = '11111111-1111-4111-8111-111111111111';
const id2 = '22222222-2222-4222-8222-222222222222';
const id3 = '33333333-3333-4333-8333-333333333333';
const signal = { callId: id1, fromDeviceId: id2, toDeviceId: id3, type: 'offer', payload: { sdp: 'test-only' } };

test('creates unique call IDs', () => {
  assert.match(createCallId(), /^[0-9a-f-]{36}$/);
  assert.notEqual(createCallId(), createCallId());
});
test('validates a bounded signaling envelope', () => {
  assert.deepEqual(validateSignal(signal), signal);
  assert.throws(() => validateSignal({ ...signal, type: 'admin' }), /signal_type_invalid/);
  assert.throws(() => validateSignal({ ...signal, toDeviceId: id2 }), /self_call_not_allowed/);
  assert.throws(() => validateSignal({ ...signal, payload: { sdp: 'x'.repeat(17000) } }), /signal_payload_too_large/);
  assert.throws(() => validateSignal({ ...signal, fromDeviceId: 'bad' }), /fromDeviceId_invalid/);
  assert.throws(() => validateSignal({ ...signal, type: 'hangup' }), /hangup_payload_must_be_empty/);
  assert.deepEqual(validateSignal({ ...signal, type: 'hangup', payload: {} }).payload, {});
});
test('rejects illegal lifecycle transitions and terminal-state revival', () => {
  assert.equal(canTransitionCall('initiated', 'ringing'), true);
  assert.equal(canTransitionCall('ringing', 'connected'), true);
  assert.equal(canTransitionCall('connected', 'ended'), true);
  assert.equal(canTransitionCall('ended', 'connected'), false);
  assert.equal(canTransitionCall('failed', 'ringing'), false);
  assert.equal(canTransitionCall('unknown', 'connected'), false);
});
