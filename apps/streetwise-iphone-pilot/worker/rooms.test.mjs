import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { makeWorker } from './index.mjs';

test('private call room accepts one guest and relays ordered, retry-safe signals', async t => {
  const sql = new DatabaseSync(':memory:');
  t.after(() => sql.close());
  sql.exec(readFileSync(new URL('../drizzle/0000_call_rooms.sql', import.meta.url),'utf8'));
  const env = { DB:{ prepare(query) {
    return { bind(...args) {
      return { first:async () => sql.prepare(query).get(...args),
        run:async () => ({ meta:sql.prepare(query).run(...args) }) };
    }, first:async () => sql.prepare(query).get() };
  } } };
  const worker = makeWorker({});
  async function request(path,{ user='pilot-owner', key, method='POST', body } = {}) {
    const response = await worker.fetch(new Request('https://pilot.example' + path,{
      method, body:body && JSON.stringify(body),
      headers:{ 'X-Streetwise':'1', ...(user && { 'oai-authenticated-user-id':user }),
        ...(key && { 'X-Room-Key':key }) }
    }),env);
    return { status:response.status, ...await response.json() };
  }
  assert.equal((await request('/api/health',{ method:'GET' })).status,'ready');
  assert.equal((await request('/rooms',{ user:null })).status,401);
  const host = await request('/rooms');
  assert.equal(host.status,201);
  const room = '/rooms/' + host.roomId;
  const claims = await Promise.all(Array.from({ length:2 }, () => request(room + '/join',{ key:host.invitation })));
  assert.deepEqual(claims.map(claim => claim.status).sort(),[200,404]);
  const guest = claims.find(claim => claim.status === 200);
  const events = (key,after=0) => request(room + '/events?after=' + after,{ key, method:'GET' });
  assert.deepEqual((await events(host.key)).events.map(event => event.type),['ready']);
  const send = (key,body) => request(room + '/signal',{ key,body });
  const offer = { type:'offer', sdp:'v=0\r\n', messageId:crypto.randomUUID() };
  const published = await send(host.key,offer);
  assert.equal(published.status,200);
  assert.deepEqual(await send(host.key,offer),published);
  const ice = { type:'ice', messageId:crypto.randomUUID(),
    candidate:{candidate:'candidate:1 1 udp 10 192.0.2.1 9999 typ host',sdpMid:'0'} };
  assert.equal((await send(host.key,ice)).status,200);
  assert.deepEqual((await events(guest.key,published.id)).events.map(event => event.type),['ice']);
  assert.equal((await send(guest.key,{type:'answer',sdp:'v=0\r\n',messageId:crypto.randomUUID()})).status,200);
  assert.equal((await request(room + '/leave',{ key:guest.key })).status,200);
  assert.deepEqual((await events(host.key,published.id)).events.map(event => event.type),['ended']);
  assert.equal((await send(host.key,offer)).status,409);
  assert.equal((await events('0'.repeat(48))).status,404);
});
