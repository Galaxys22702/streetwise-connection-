import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeviceChallengeStore } from '../src/services/callingDeviceChallenge.js';
const deviceId = '11111111-1111-4111-8111-111111111111';
const ownerUserId = 'usr_' + 'a'.repeat(32);
test('challenge is one-time and expires', () => {
  let now = 1000;
  const store = createDeviceChallengeStore({ now: () => now, ttlMs: 100 });
  const first = store.issue({ deviceId, ownerUserId });
  assert.equal(store.consume({ deviceId, ownerUserId, response: first.challenge }), true);
  assert.equal(store.consume({ deviceId, ownerUserId, response: first.challenge }), false);
  const second = store.issue({ deviceId, ownerUserId });
  now += 101;
  assert.equal(store.consume({ deviceId, ownerUserId, response: second.challenge }), false);
});
test('wrong response cannot be retried and capacity is bounded', () => {
  const store = createDeviceChallengeStore({ maxChallenges: 1 });
  const first = store.issue({ deviceId, ownerUserId });
  assert.equal(store.consume({ deviceId, ownerUserId, response: 'wrong' }), false);
  assert.equal(store.consume({ deviceId, ownerUserId, response: first.challenge }), false);
  store.issue({ deviceId, ownerUserId });
  assert.throws(() => store.issue({ deviceId: '22222222-2222-4222-8222-222222222222', ownerUserId }), /challenge_capacity_reached/);
});
