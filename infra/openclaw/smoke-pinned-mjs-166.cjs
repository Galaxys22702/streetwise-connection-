'use strict';
// #166 build-only import smoke. Loads the pinned module but NEVER calls the probe.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
async function main() {
  const dist = '/usr/local/lib/node_modules/openclaw/dist';
  const matches = fs.readdirSync(dist).filter(name => /^setup-inference-turn-[\w-]+\.mjs$/.test(name));
  if (matches.length !== 1) throw Error('Expected one pinned setup-inference module.');
  const file = path.join(dist, matches[0]);
  const source = fs.readFileSync(file, 'utf8');
  if (!source.includes('issue166ProbeGate.start(route)') ||
      !source.includes('issue166ProbeGate.onRateLimit(error)')) {
    throw Error('Bounded setup-inference guard was not installed.');
  }
  const mod = await import(pathToFileURL(file).href);
  if (typeof mod.o !== 'function') throw Error('Pinned setup-inference module missing callable export.');
  const gate = require('/app/probe-gate-166.cjs').createProbeGuard();
  if (!gate.isFreeRoute({provider:'openrouter', model:'openrouter/free'})) {
    throw Error('OpenRouter free route not recognized.');
  }
  // Verify the real pinned error classifier recognizes HTTP 429. No request is sent.
  const coreChunks = fs.readdirSync(dist).filter(name => /^setup-inference-core-[\\w-]+\\.mjs$/.test(name));
  if (coreChunks.length !== 1) throw Error('Pinned setup-error module not unique.');
  const setupCore = await import(pathToFileURL(path.join(dist, coreChunks[0])).href);
  if (typeof setupCore.s !== 'function') throw Error('Pinned setup-error classifier not exported.');
  const route = { provider: 'openrouter', runConfig: {} };
  for (const err of [
    Object.assign(new Error('HTTP 429 Too Many Requests'), { status: 429 }),
    new Error('HTTP 429 Too Many Requests'),
  ]) {
    const classified = setupCore.s(err, route);
    const safeStatus = ['rate_limit', 'unknown', 'billing', 'format', 'unavailable'].includes(classified.status) ? classified.status : 'other';
    console.log('[JARVIS] Issue #166: 429 signal classification = ' + safeStatus + ' (test form only).');
    if (classified.status !== 'rate_limit') {
      throw Error('Issue #166: HTTP 429 was not classified as rate_limit; refusing image.');
    }
  }
  console.log('[JARVIS] Issue #166: pinned HTTP 429 error classification verified without provider calls.');
  console.log('[JARVIS] Issue #166: pinned module import and guard verified in build image; no probe executed.');
}
main().catch(error => {
  console.error('[JARVIS] Issue #166: build-only import smoke failed (' + error.name + ').');
  process.exitCode = 1;
});
