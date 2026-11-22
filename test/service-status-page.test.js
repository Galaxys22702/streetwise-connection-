import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
test('service status is linked from homepage', () => {
  assert.match(read('../public/index.html'), /href="\/service-status\.html"/);
});
test('service status clearly discloses that cellular service has not launched', () => {
  const page = read('../public/service-status.html');
  assert.match(page, /has not launched/i);
  assert.match(page, /Not launched/);
  assert.match(page, /not yet ready/i);
});
test('waitlist state is derived from public API and failures never imply open', () => {
  const script = read('../public/service-status.js');
  assert.match(script, /fetch\('\/api\/public-status'/);
  assert.match(script, /data\?\.waitlist\?\.open === true/);
  assert.match(script, /Unable to verify/);
  assert.doesNotMatch(script, /POST|localStorage|sessionStorage|service_role/);
});
