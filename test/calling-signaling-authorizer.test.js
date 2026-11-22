import test from 'node:test';
import assert from 'node:assert/strict';
import { createSignalingAuthorizer } from '../src/services/callingSignalingAuthorizer.js';

const alice = '22222222-2222-4222-8222-222222222222';
const bob = '33333333-3333-4333-8333-333333333333';
const callId = '11111111-1111-4111-8111-111111111111';
const signal = { callId, fromDeviceId: alice, toDeviceId: bob, type: 'offer', payload: {} };
const devices = {
  [alice]: { ownerUserId: 'usr_alice', revokedAt: null },
  [bob]: { ownerUserId: 'usr_bob', revokedAt: null }
};
const call = { callerDeviceId: alice, calleeDeviceId: bob, state: 'ringing' };
const authorize = createSignalingAuthorizer({ findDevice: async id => devices[id], findCall: async id => id === callId ? call : null });

test('authorizes only owning user and actual call participants', async () => {
  assert.equal(await authorize({ principal: { id: 'usr_alice' }, action: 'send', signal }), true);
  assert.equal(await authorize({ principal: { id: 'usr_bob' }, action: 'send', signal }), false);
  assert.equal(await authorize({ principal: { id: 'usr_bob' }, action: 'receive', deviceId: bob, callId }), true);
  assert.equal(await authorize({ principal: { id: 'usr_alice' }, action: 'receive', deviceId: bob, callId }), false);
});
test('rejects revoked devices, unrelated calls and closed sessions', async () => {
  const revoked = createSignalingAuthorizer({ findDevice: async () => ({ ownerUserId: 'usr_alice', revokedAt: new Date() }), findCall: async () => call });
  assert.equal(await revoked({ principal: { id: 'usr_alice' }, action: 'send', signal }), false);
  const ended = createSignalingAuthorizer({ findDevice: async () => devices[alice], findCall: async () => ({ ...call, state: 'ended' }) });
  assert.equal(await ended({ principal: { id: 'usr_alice' }, action: 'send', signal }), false);
  assert.equal(await authorize({ principal: { id: 'usr_alice' }, action: 'send', signal: { ...signal, toDeviceId: alice } }), false);
});
test('fails closed without trusted lookups or identity', async () => {
  assert.throws(() => createSignalingAuthorizer({}), /trusted_lookup_required/);
  assert.equal(await authorize({ action: 'send', signal }), false);
});
