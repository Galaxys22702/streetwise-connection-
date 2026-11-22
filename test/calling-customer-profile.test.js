import test from 'node:test';
import assert from 'node:assert/strict';
import { createCustomerProfileBridge } from '../src/services/callingCustomerProfile.js';
const userId = 'usr_' + 'a'.repeat(32);
test('idempotently links existing account to private profile', async () => {
  let captured;
  const ensure = createCustomerProfileBridge({ query: async (sql, params) => {
    captured = { sql, params };
    return { rows: [{ id: 'customer-id', status: 'prospect' }] };
  } });
  assert.deepEqual(await ensure({ userId, email: ' USER@EXAMPLE.COM ' }), { id: 'customer-id', status: 'prospect' });
  assert.match(captured.sql, /on conflict \(legacy_user_id\)/);
  assert.deepEqual(captured.params, [userId, 'user@example.com']);
});
test('rejects untrusted identity and invalid contact', async () => {
  const ensure = createCustomerProfileBridge({ query: async () => ({ rows: [] }) });
  await assert.rejects(ensure({ userId: 'fake', email: 'user@example.com' }), /authenticated_user_required/);
  await assert.rejects(ensure({ userId, email: 'invalid' }), /valid_email_required/);
});
