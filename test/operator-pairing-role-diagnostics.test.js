import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { pendingRoleSummary, selectOperatorRequests } = require('../infra/openclaw/approve-operator.cjs');

test('pending role diagnostic counts without returning identifiers or secrets', () => {
  const pending = [
    { role: 'operator', requestId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', token: 'secret' },
    { roles: ['node'], requestId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' },
    { roles: ['operator', 'node'], requestId: 'cccccccc-cccc-cccc-cccc-cccccccccccc' },
    { requestId: 'dddddddd-dddd-dddd-dddd-dddddddddddd' }
  ];
  const summary = pendingRoleSummary({ pending });
  assert.deepEqual(summary, { total: 4, operatorOnly: 1, nodeOrMixed: 2, missingOrOtherRole: 1 });
  assert.doesNotMatch(JSON.stringify(summary), /secret|aaaaaaaa|bbbbbbbb|cccccccc|dddddddd/);
  assert.deepEqual(selectOperatorRequests({ pending }), ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']);
});

test('nested and empty device lists return only aggregate role buckets', () => {
  assert.deepEqual(pendingRoleSummary(null), { total: 0, operatorOnly: 0, nodeOrMixed: 0, missingOrOtherRole: 0 });
  assert.deepEqual(pendingRoleSummary({ devices: { pending: [{ roles: ['operator'] }] } }),
    { total: 1, operatorOnly: 1, nodeOrMixed: 0, missingOrOtherRole: 0 });
});

test('role summary does not approve node-only or mixed-role requests', () => {
  const pending = [{ roles: ['node'], requestId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    { roles: ['node', 'operator'], requestId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' }];
  assert.deepEqual(selectOperatorRequests({ pending }), []);
  assert.deepEqual(pendingRoleSummary({ pending }),
    { total: 2, operatorOnly: 0, nodeOrMixed: 2, missingOrOtherRole: 0 });
});
