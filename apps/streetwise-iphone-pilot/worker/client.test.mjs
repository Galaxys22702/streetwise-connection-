import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

test('leaving the page while sharing an invite does not end the waiting room', async () => {
  const events = {};
  const requests = [];
  const nodes = new Map();
  const getElementById = id => {
    if (!nodes.has(id)) nodes.set(id, {
      setAttribute() {},
      addEventListener(type, handler) { this[type] = handler; }
    });
    return nodes.get(id);
  };
  let stopped = false;
  class MockPeer {
    addTrack() {}
    addEventListener() {}
    close() {}
  }
  runInNewContext(readFileSync(new URL('../public/call.js', import.meta.url),'utf8'),{
    document:{ getElementById }, URL, URLSearchParams, AbortSignal,
    location:new URL('https://pilot.example/'),
    window:{ RTCPeerConnection:MockPeer }, RTCPeerConnection:MockPeer,
    navigator:{ mediaDevices:{ getUserMedia:async () => ({
      getTracks:() => [{ stop:() => { stopped = true; } }]
    }) } },
    addEventListener:(event,handler) => { events[event] = handler; },
    setTimeout:() => 1, clearTimeout() {},
    fetch:async path => {
      requests.push(path);
      const reply = path === '/rooms' ? { roomId:'local-test-room', key:'placeholder',
        invitation:'placeholder',iceServers:[] } : { events:[] };
      return { ok:true,json:async () => reply };
    }
  });
  await getElementById('start').click();
  assert.equal(getElementById('share').hidden,false);
  events.pagehide();
  assert.ok(!requests.some(path => path.endsWith('/leave')));
  assert.equal(stopped,false);
  getElementById('end').click();
  assert.equal(requests.filter(path => path.endsWith('/leave')).length,1);
  assert.equal(stopped,true);
});
