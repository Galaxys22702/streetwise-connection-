import test from 'node:test';
import assert from 'node:assert/strict';
import { createCallingPilot } from '../src/services/callingPilotApi.js';

test('pilot is disabled by default, even without authentication', async () => {
  const previous = process.env.STREETWISE_CALLING_PILOT_ENABLED;
  delete process.env.STREETWISE_CALLING_PILOT_ENABLED;
  try {
    const handler = createCallingPilot({ authenticate: async () => null });
    assert.deepEqual(await handler({ method: 'POST', pathname: '/api/pilot/devices', body: {}, request: {} }), {
      status: 404, json: { error: 'not_found' }
    });
  } finally {
    if (previous === undefined) delete process.env.STREETWISE_CALLING_PILOT_ENABLED;
    else process.env.STREETWISE_CALLING_PILOT_ENABLED = previous;
  }
});
test('pilot enabled still rejects unauthenticated requests', async () => {
  const previous = process.env.STREETWISE_CALLING_PILOT_ENABLED;
  process.env.STREETWISE_CALLING_PILOT_ENABLED = 'true';
  try {
    const handler = createCallingPilot({ authenticate: async () => null });
    const result = await handler({ method: 'POST', pathname: '/api/pilot/signals', body: {}, request: {} });
    assert.equal(result.status, 401);
  } finally {
    if (previous === undefined) delete process.env.STREETWISE_CALLING_PILOT_ENABLED;
    else process.env.STREETWISE_CALLING_PILOT_ENABLED = previous;
  }
});
test('rejects missing authentication dependency', () => {
  assert.throws(() => createCallingPilot(), /authentication_required/);
});
