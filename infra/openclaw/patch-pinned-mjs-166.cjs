'use strict';
// Issue #166: fail-closed, pinned OpenClaw 2026.9.9 .mjs probe repair.
// Build-time vendor-bundle change only. Never reads /data, tokens or sessions.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const root = args.find(x => x !== '--check') || '/usr/local/lib/node_modules/openclaw/dist';
const insertImport = 'import issue166RuntimeGuard from "/app/probe-gate-166.cjs";\n';
function replaceExactlyOnce(source, from, to, label) {
  if (source.split(from).length !== 2) throw Error('Issue #166: unique ' + label + ' anchor not found; refusing to patch.');
  return source.replace(from, () => to);
}
function patch(source) {
  if (source.includes('issue166RuntimeGuard')) throw Error('Issue #166: bundle already modified; refusing a second patch.');
  const region = '//#region src/system-agent/setup-inference-turn.ts';
  const begin = 'async function runSetupInferenceTurn(params) {\n\tconst { route, deps } = params;';
  const tryAnchor = '\ttry {\n\t\tif (params.signal?.aborted) throw new SetupInferenceCancelledError();\n\t\tregisterHiddenSetupInferenceProbeRun(runId, route.agentId, sessionKey);';
  const thinking = '\t\t\t\tlane: `session:probe-setup-inference:${route.provider}`,\n\t\t\t\tthinkLevel: "off",\n\t\t\t\treasoningLevel: "off",';
  const finishing = '\t} catch (error) {\n\t\tconst described = describeSetupInferenceError(error, route);\n\t\treturn failed(described.status, described.error);\n\t} finally {\n\t\tpreparedRunAdmission.close();';
  const replacementBegin = 'async function runSetupInferenceTurn(params) {\n\tconst { route, deps } = params;\n\tlet issue166Ticket = null;';
  const replacementTry = '\ttry {\n\t\tif (params.signal?.aborted) throw new SetupInferenceCancelledError();\n\t\tissue166Ticket = issue166ProbeGate.start(route);\n\t\tif (!issue166Ticket.allowed) return failed("rate_limit", "OpenRouter free setup probe temporarily paused; retry after cooldown.");\n\t\tregisterHiddenSetupInferenceProbeRun(runId, route.agentId, sessionKey);';
  const replacementThinking = '\t\t\t\tlane: `session:probe-setup-inference:${route.provider}`,\n\t\t\t\tthinkLevel: issue166ProbeGate.isFreeRoute(route) ? "minimal" : "off",\n\t\t\t\treasoningLevel: issue166ProbeGate.isFreeRoute(route) ? "minimal" : "off",';
  const replacementFinishing = '\t} catch (error) {\n\t\tconst described = describeSetupInferenceError(error, route);\n\t\tif (issue166Ticket?.allowed && issue166Ticket?.controlled && described.status === "rate_limit") issue166ProbeGate.onRateLimit(error);\n\t\treturn failed(described.status, described.error);\n\t} finally {\n\t\tissue166ProbeGate.release(issue166Ticket);\n\t\tpreparedRunAdmission.close();';
  let next = source;
  next = replaceExactlyOnce(next, region, 'const issue166ProbeGate = issue166RuntimeGuard.createProbeGuard();\n' + region, 'source region');
  next = replaceExactlyOnce(next, begin, replacementBegin, 'probe function');
  next = replaceExactlyOnce(next, tryAnchor, replacementTry, 'pre-request guard');
  next = replaceExactlyOnce(next, thinking, replacementThinking, 'thinking fields');
  next = replaceExactlyOnce(next, finishing, replacementFinishing, '429 capture/release');
  return insertImport + next;
}
function main() {
  const candidates = fs.readdirSync(root).filter(name => /^setup-inference-turn-[\w-]+\.mjs$/.test(name));
  if (candidates.length !== 1) throw Error('Issue #166: expected one pinned .mjs setup-inference chunk; got ' + candidates.length);
  const target = path.join(root, candidates[0]);
  const info = fs.lstatSync(target);
  if (!info.isFile() || info.isSymbolicLink() || info.size > 2_000_000) throw Error('Issue #166: unsafe compiled target.');
  const original = fs.readFileSync(target, 'utf8');
  const planned = patch(original);
  // Syntax check in a disposable .mjs before changing even a build artifact.
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-166-bundle-'));
  try {
    const candidate = path.join(temp, 'probe.mjs');
    fs.writeFileSync(candidate, planned, { mode: 0o600, flag: 'wx' });
    const checked = spawnSync(process.execPath, ['--check', candidate], { encoding: 'utf8' });
    if (checked.status !== 0) throw Error('Issue #166: patched ESM failed syntax validation.');
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
  if (checkOnly) {
    console.log('[JARVIS] Issue #166: one pinned .mjs probe verified; no files changed.');
  } else {
    fs.writeFileSync(target, planned, 'utf8');
    console.log('[JARVIS] Issue #166: pinned .mjs free-route guard applied in build image only.');
  }
}
if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { patch };