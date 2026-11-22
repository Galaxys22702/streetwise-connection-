import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('Network Lab explicitly allows self microphone permission without opening other pages', () => {
  const server = readFileSync(new URL('../src/server.js', import.meta.url), 'utf8');
  assert.match(server, /\["\/jarvis\.html", "\/network-lab\.html"\]\.includes\(pathname\)/);
  assert.match(server, /microphone=\$\{/);
  assert.match(server, /: "\(\)"/);
});
