import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createProbeCooldown, retryAfterMs } = require('../infra/openclaw/probe-cooldown.cjs');
test('429 starts cooldown; no calls allowed before expiry', () => {
  let clock = 1000;
  const guard = createProbeCooldown({ now: () => clock });
  assert.equal(guard.allowed(), true);
  guard.rateLimited('120');
  assert.equal(guard.allowed(), false);
  clock += 119999;
  assert.equal(guard.allowed(), false);
  clock++;
  assert.equal(guard.allowed(), true);
});
test('retry-after HTTP date and invalid fallback are bounded', () => {
  const now = Date.parse('2026-11-21T00:00:00Z');
  assert.equal(retryAfterMs('Sat, 21 Nov 2026 00:02:00 GMT', now), 120000);
  assert.equal(retryAfterMs('nonsense', now), null);
  assert.equal(retryAfterMs('99999999', now), 86400000);
  let clock = 0;
  const guard = createProbeCooldown({ now: () => clock });
  assert.equal(guard.rateLimited('invalid'), 900000);
});
test('repeated 429 cannot shorten cooldown', () => {
  let clock = 0;
  const guard = createProbeCooldown({ now: () => clock });
  guard.rateLimited('3600');
  clock = 1000;
  guard.rateLimited('60');
  assert.equal(guard.remainingMs(), 3599000);
});
test('400 does not consume cooldown; successful recovery after expiry', () => {
  let clock = 0;
  const guard = createProbeCooldown({ now: () => clock });
  assert.equal(guard.allowed(), true);
  guard.rateLimited('60');
  clock = 60000;
  assert.equal(guard.allowed(), true);
  guard.reset();
  assert.equal(guard.remainingMs(), 0);
});

test('guard makes zero provider requests during cooldown and one after expiry', async () => {
  let clock = 0;
  let requests = 0;
  const guard = createProbeCooldown({ now: () => clock });
  const request = async () => { requests++; return 'OK'; };
  guard.rateLimited('120');
  const blocked = await guard.runIfAllowed(request);
  assert.deepEqual(blocked, { skipped: true, reason: 'cooldown', retryAfterMs: 120000 });
  assert.equal(requests, 0);
  clock = 120000;
  assert.deepEqual(await guard.runIfAllowed(request), { skipped: false, result: 'OK' });
  assert.equal(requests, 1);
});

test('simultaneous probes admit only one request, and release lock after failure', async () => {
  const guard = createProbeCooldown();
  let calls = 0;
  let release;
  const first = guard.runIfAllowed(() => {
    calls++;
    return new Promise(resolve => { release = resolve; });
  });
  const second = await guard.runIfAllowed(() => { calls++; return 'unexpected'; });
  assert.deepEqual(second, { skipped: true, reason: 'in_flight' });
  assert.equal(calls, 1);
  release('done');
  assert.deepEqual(await first, { skipped: false, result: 'done' });
  await assert.rejects(guard.runIfAllowed(() => { throw new Error('mock failure'); }), /mock failure/);
  assert.deepEqual(await guard.runIfAllowed(() => 'recovered'), { skipped: false, result: 'recovered' });
});
