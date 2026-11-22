import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { pendingRoleSummary, selectOperatorRequests } = require('../infra/openclaw/approve-operator.cjs');

test('role diagnostics count requests without returning identifiers or device secrets', () => {
  const pending = [
    { role: 'operator', requestId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', token: 'secret' },
    { roles: ['node'], requestId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' },
    { roles: ['operator', 'node'], requestId: 'cccccccc-cccc-cccc-cccc-cccccccccccc' },
    { requestId: 'dddddddd-dddd-dddd-dddd-dddddddddddd' }
  ];
  const result = pendingRoleSummary({ pending });
  assert.deepEqual(result, { total: 4, operatorOnly: 1, nodeOrMixed: 2, missingOrOtherRole: 1 });
  assert.doesNotMatch(JSON.stringify(result), /secret|aaaaaaaa|bbbbbbbb|cccccccc|dddddddd/);
  assert.deepEqual(selectOperatorRequests({ pending }), ['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']);
});

test('empty and nested pending lists produce safe counts', () => {
  assert.deepEqual(pendingRoleSummary(null), { total: 0, operatorOnly: 0, nodeOrMixed: 0, missingOrOtherRole: 0 });
  assert.deepEqual(pendingRoleSummary({ devices: { pending: [{ roles: ['operator'] }] } }), { total: 1, operatorOnly: 1, nodeOrMixed: 0, missingOrOtherRole: 0 });
});
