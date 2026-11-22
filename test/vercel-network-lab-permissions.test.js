import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('Vercel permits microphone only for intentional test pages', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  const policy = path => config.headers.find(rule => rule.source === path)?.headers.find(h => h.key === 'Permissions-Policy')?.value;
  assert.match(policy('/(.*)'), /microphone=\(\)/);
  assert.match(policy('/network-lab.html'), /microphone=\(self\)/);
  assert.match(policy('/jarvis.html'), /microphone=\(self\)/);
});
