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
    assert.equal(url.href, 'https://openrouter.ai/api/v1/chat/completions');
    const body = JSON.parse(options.body);
    assert.equal(options.redirect, 'error');
    assert.equal(body.model, 'openrouter/free');
    assert.equal(body.messages.at(-1).content, 'Hello');
    assert.deepEqual(body.provider.max_price, { prompt: 0, completion: 0 });
    assert.ok(options.signal);
    return Response.json({ choices: [{ message: { content: 'Hello, sir.' } }] });
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

test('HP chat blocks paid routes before contacting a provider and reports free-quota throttling honestly', async t => {
  const paid = await start(t, { apiKey: 'test-only-placeholder', model: 'openrouter/auto',
    fetchImpl: () => assert.fail('a paid route must not run') });
  const refused = await paid.chat({ message: 'Hello' });
  assert.equal(refused.status, 503);
  assert.match((await refused.json()).error, /Paid models are blocked/);
  const limited = await start(t, { apiKey: 'test-only-placeholder',
    fetchImpl: async () => new Response('private upstream details', { status: 429, headers: { 'retry-after': '30' } }) });
  const response = await limited.chat({ message: 'Hello' });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '30');
  assert.doesNotMatch(await response.text(), /private upstream details|test-only-placeholder/);
});
