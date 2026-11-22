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
  console.log('[JARVIS] Issue #166: pinned module import and guard verified in build image; no probe executed.');
}
main().catch(error => {
  console.error('[JARVIS] Issue #166: build-only import smoke failed (' + error.name + ').');
  process.exitCode = 1;
});
