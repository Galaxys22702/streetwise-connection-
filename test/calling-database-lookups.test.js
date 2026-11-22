import test from 'node:test';
import assert from 'node:assert/strict';
import { createCallingLookups } from '../src/services/callingDatabaseLookups.js';

const id = '11111111-1111-4111-8111-111111111111';
test('device lookup requires verification and returns only authorization fields', async () => {
  const calls = [];
  const lookups = createCallingLookups({ query: async (sql, params) => {
    calls.push({ sql, params });
    return { rows: [{ id, legacy_user_id: 'usr_123', revoked_at: null }] };
  } });
  assert.deepEqual(await lookups.findDevice(id), { ownerUserId: 'usr_123', revokedAt: null });
  assert.match(calls[0].sql, /verified_at is not null/);
  assert.match(calls[0].sql, /legacy_user_id/);
  assert.deepEqual(calls[0].params, [id]);
  assert.equal(await lookups.findDevice('invalid'), null);
  assert.equal(calls.length, 1);
});
test('call lookup returns participants and state only', async () => {
  const lookups = createCallingLookups({ query: async (sql, params) => {
    assert.match(sql, /streetwise_core\.call_sessions/);
    assert.deepEqual(params, [id]);
    return { rows: [{ caller_device_id: id, callee_device_id: null, state: 'ringing' }] };
  } });
  assert.deepEqual(await lookups.findCall(id), { callerDeviceId: id, calleeDeviceId: null, state: 'ringing' });
  assert.equal(await lookups.findCall('invalid'), null);
});
test('missing rows and invalid query dependencies fail safely', async () => {
  assert.throws(() => createCallingLookups({ query: null }), /database_query_required/);
  const lookups = createCallingLookups({ query: async () => ({ rows: [] }) });
  assert.equal(await lookups.findDevice(id), null);
  assert.equal(await lookups.findCall(id), null);
});
