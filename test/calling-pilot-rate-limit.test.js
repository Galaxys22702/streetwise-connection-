import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('pilot endpoints remain disabled by default and rate-limited when enabled', () => {
  const server = readFileSync(new URL('../src/server.js', import.meta.url), 'utf8');
  assert.match(server, /STREETWISE_CALLING_PILOT_ENABLED !== "true"/);
  assert.match(server, /enforceRateLimit\(req, \{ scope: "calling_pilot", maxAttempts: 60, windowMs: 60_000 \}\)/);
  assert.match(server, /const body = req\.method === "POST" \? await readJsonBody\(req\) : \{\}/);
});
