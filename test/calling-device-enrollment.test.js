import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeviceEnrollment } from '../src/services/callingDeviceEnrollment.js';
const userId = 'usr_' + 'a'.repeat(32);
test('enrolls device unverified, scoped to existing authenticated customer', async () => {
  let captured;
  const register = createDeviceEnrollment({ query: async (sql, params) => {
    captured = { sql, params };
    return { rows: [{ id: params[0], device_label: params[1], platform: params[2], verified_at: null }] };
  } });
  const result = await register({ userId, label: ' My Dell ', platform: 'web' });
  assert.equal(result.verified, false);
  assert.equal(result.label, 'My Dell');
  assert.match(captured.sql, /legacy_user_id = \$4/);
  assert.match(captured.sql, /returning id, device_label, platform, verified_at/);
  assert.deepEqual(captured.params.slice(1), ['My Dell', 'web', userId]);
});
test('refuses unauthenticated identities, invalid input and absent customer', async () => {
  const register = createDeviceEnrollment({ query: async () => ({ rows: [] }) });
  await assert.rejects(register({ userId: 'wrong', label: 'phone', platform: 'ios' }), /authenticated_user_required/);
  await assert.rejects(register({ userId, label: '', platform: 'ios' }), /device_label_invalid/);
  await assert.rejects(register({ userId, label: 'phone', platform: 'fake' }), /device_platform_invalid/);
  await assert.rejects(register({ userId, label: 'phone', platform: 'ios' }), /customer_profile_required/);
});
