import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import http from 'node:http';
import { createLocalServer } from '../jarvis/local/server.js';

async function start(t, options = {}) {
  const server = createLocalServer(options);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const chat = (data, headers = {}) => fetch(`${base}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(data) });
  return { base, chat };
}

test('HP workspace serves all local pages without a key and rejects unsafe requests', async t => {
  const { base, chat } = await start(t, { apiKey: '' });
  for (const path of ['/', '/index.js', '/jarvis-money.html', '/jarvis-money.js', '/investigator.html', '/investigator.js']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-security-policy'), /script-src 'self'/);
  }
  assert.deepEqual(await (await fetch(base + '/health')).json(), { ok: true, aiConfigured: false });
  assert.equal((await chat({ message: 'Hello' })).status, 503);
  assert.equal((await chat({ message: '' })).status, 400);
  assert.equal((await chat(null)).status, 400);
  assert.equal((await chat({ message: 'Hi' }, { origin: 'https://untrusted.example' })).status, 403);
  const badHostStatus = await new Promise((resolve, reject) => {
    const request = http.get(base + '/health', { headers: { host: 'untrusted.example' } }, response => {
      response.resume(); resolve(response.statusCode);
    });
    request.on('error', reject);
  });
  assert.equal(badHostStatus, 403);
  assert.equal((await chat({ message: 'Hi' }, { 'content-type': 'text/plain' })).status, 415);
  assert.equal((await chat({ message: 'x'.repeat(21000) })).status, 413);
  assert.equal((await fetch(base + '/server.js')).status, 404);
});

test('HP chat calls only the provider and returns text without exposing credentials', async t => {
  let calls = 0;
  const { chat } = await start(t, { apiKey: 'test-only-placeholder', fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const body = JSON.parse(options.body);
    assert.equal(body.store, false);
    assert.equal(body.input, 'Hello');
    assert.ok(options.signal);
    return Response.json({ output: [{ content: [{ type: 'output_text', text: 'Hello, sir.' }] }] });
  } });
  const response = await chat({ message: 'Hello' });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { answer: 'Hello, sir.' });
  assert.equal(calls, 1);
});

test('HP provider errors are bounded and do not disclose provider response details', async t => {
  const { chat } = await start(t, { apiKey: 'test-only-placeholder', fetchImpl: async () => Response.json({ private: 'must not leak' }, { status: 401 }) });
  const response = await chat({ message: 'Hello' });
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /must not leak|test-only-placeholder/);
});
