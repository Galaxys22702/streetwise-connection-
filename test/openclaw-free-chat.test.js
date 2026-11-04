import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, statSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { configureFreeChat, planConfig, planSessions } = createRequire(import.meta.url)('../infra/openclaw/configure-free-chat.cjs');
const free = 'openrouter/openrouter/free';
const inkling = 'openrouter/thinkingmachines/inkling:free';
const suffix = '.pre-jarvis-free-chat-v1';
function fixture(t, overrides = {}) {
  const state = mkdtempSync(join(tmpdir(), 'jarvis-free-chat-'));
  t.after(() => rmSync(state, { recursive: true, force: true }));
  const target = join(state, 'openclaw.json');
  const store = join(state, 'agents', 'main', 'sessions', 'sessions.json');
  mkdirSync(join(state, 'agents', 'main', 'sessions'), { recursive: true });
  const cfg = { agents: { defaults: { model: { primary: free, fallbacks: [inkling, free] },
    models: { [free]: { alias: 'Free', params: { temperature: 0.4 } } }, thinkingDefault: 'medium',
    timeoutSeconds: 0, heartbeat: { every: '30m', prompt: 'keep' } } },
    plugins: { entries: { 'memory-core': { enabled: true } } },
    auth: { profiles: { existing: { ref: 'fixture-only' } } }, tools: { exec: { security: 'allowlist' } }, ...overrides };
  const sessions = { 'agent:main:main': { model: 'thinkingmachines/inkling:free', modelProvider: 'openrouter',
    modelOverride: 'thinkingmachines/inkling:free', providerOverride: 'openrouter', modelOverrideSource: 'user',
    thinkingLevel: 'off', messages: [{ content: inkling }], systemPromptReport: { model: inkling } } };
  writeFileSync(target, JSON.stringify(cfg));
  writeFileSync(store, JSON.stringify(sessions));
  return { state, target, store, cfg, sessions, env: { OPENCLAW_CONFIG_PATH: target, OPENCLAW_STATE_DIR: state, JARVIS_FREE_CHAT_PROFILE: '1' },
    read: file => JSON.parse(readFileSync(file, 'utf8')) };
}

test('free chat tuning is opt-in and has no effect without its exact flag', t => {
  const f = fixture(t);
  for (const flag of [undefined, '', '0', 'true']) {
    assert.deepEqual(configureFreeChat({ ...f.env, JARVIS_FREE_CHAT_PROFILE: flag }), { reason: 'disabled' });
    assert.deepEqual(f.read(f.target), f.cfg);
    assert.deepEqual(f.read(f.store), f.sessions);
  }
});

test('tuning bounds long retries, keeps reasoning, saves foreground quota, and releases the stale session pin', t => {
  const f = fixture(t);
  const configBefore = readFileSync(f.target, 'utf8');
  const sessionsBefore = readFileSync(f.store, 'utf8');
  assert.deepEqual(configureFreeChat(f.env), { reason: 'applied', sessionsApplied: 1, sessionsSkipped: 0 });
  const next = f.read(f.target);
  assert.deepEqual(next.agents.defaults.model, { primary: free, fallbacks: [] });
  assert.equal(next.agents.defaults.thinkingDefault, 'minimal');
  assert.equal(next.agents.defaults.timeoutSeconds, 120);
  assert.deepEqual(next.agents.defaults.heartbeat, { every: '0m', prompt: 'keep' });
  for (const key of ['plugins', 'auth', 'tools']) assert.deepEqual(next[key], f.cfg[key]);
  assert.deepEqual(next.agents.defaults.models, f.cfg.agents.defaults.models);
  const entry = f.read(f.store)['agent:main:main'];
  assert.equal(entry.model, 'openrouter/free');
  assert.equal(entry.modelProvider, 'openrouter');
  for (const key of ['modelOverride', 'providerOverride', 'modelOverrideSource']) assert.equal(Object.hasOwn(entry, key), false);
  assert.equal(entry.thinkingLevel, 'minimal');
  assert.deepEqual(entry.messages, f.sessions['agent:main:main'].messages);
  assert.deepEqual(entry.systemPromptReport, f.sessions['agent:main:main'].systemPromptReport);
  for (const [file, before] of [[f.target, configBefore], [f.store, sessionsBefore]]) {
    assert.equal(readFileSync(file + suffix, 'utf8'), before);
    assert.equal(statSync(file + suffix).mode & 0o777, 0o600);
    assert.equal(statSync(file).mode & 0o777, 0o600);
  }
  assert.deepEqual(configureFreeChat(f.env), { reason: 'unchanged', sessionsApplied: 0, sessionsSkipped: 0 });
});

test('unrelated, locked, and external sessions are preserved while free-router split routes inherit the default', () => {
  const untouched = {
    other: { modelOverride: 'thinkingmachines/inkling:free', providerOverride: 'custom', thinkingLevel: 'high' },
    fullButOtherProvider: { modelOverride: inkling, providerOverride: 'custom' },
    locked: { modelOverride: inkling, modelSelectionLocked: true },
    external: { modelOverride: inkling, acp: { runtime: 'test' } },
    pendingRollback: { modelOverride: inkling, modelFallback: { previousModel: 'keep' } },
    missing: { messages: [free] }, metadata: 'keep'
  };
  const original = structuredClone(untouched);
  const next = planSessions({ ...untouched, router: { modelOverride: 'openrouter/free', providerOverride: 'openrouter', thinkingLevel: 'off' },
    legacy: { modelOverride: free, thinkingLevel: 'medium' } });
  for (const key of Object.keys(untouched)) assert.deepEqual(next[key], untouched[key]);
  assert.deepEqual(untouched, original);
  assert.deepEqual(next.router, { thinkingLevel: 'minimal' });
  assert.deepEqual(next.legacy, { thinkingLevel: 'minimal' });
});

test('unsupported defaults, paid fallbacks, includes, catalogs and allowlists never change configuration or sessions', t => {
  for (const cfg of [
    { agents: { defaults: { model: 'openrouter/vendor/paid' } } },
    { agents: { defaults: { model: { primary: free, fallbacks: ['openrouter/auto'] } } } },
    { agents: { defaults: { model: free, heartbeat: [] } } },
    { agents: { defaults: { model: free, models: { 'other/model': {} } } } },
    { agents: { defaults: { model: free }, list: [{ id: 'main', model: 'openrouter/vendor/paid' }] } },
    { agents: { defaults: { model: free }, entries: { main: { model: free } } } },
    { agents: { defaults: { model: free, $include: 'private.json' } } },
    { agents: { defaults: { model: free } } , models: { mode: 'replace' } }
  ]) {
    const f = fixture(t, cfg);
    assert.deepEqual(configureFreeChat(f.env), { reason: 'unsupported_config' });
    assert.deepEqual(f.read(f.target), f.cfg);
    assert.deepEqual(f.read(f.store), f.sessions);
  }
});

test('Inkling string defaults gain an allowed free router and preserve custom model metadata and tighter timeouts', () => {
  const cfg = { agents: { defaults: { model: inkling, models: { [inkling]: { alias: 'Legacy' } }, timeoutSeconds: 30 } } };
  const next = planConfig(cfg);
  assert.equal(next.agents.defaults.model, free);
  assert.deepEqual(next.agents.defaults.models, { [inkling]: { alias: 'Legacy' }, [free]: {} });
  assert.equal(next.agents.defaults.timeoutSeconds, 30);
  assert.equal(cfg.agents.defaults.model, inkling);
});

test('config backup failure prevents session tuning and conflicting session backups are reported', t => {
  const f = fixture(t);
  writeFileSync(f.target + suffix, '{}', { mode: 0o600 });
  assert.deepEqual(configureFreeChat(f.env), { reason: 'backup_unavailable' });
  assert.deepEqual(f.read(f.target), f.cfg);
  assert.deepEqual(f.read(f.store), f.sessions);
  rmSync(f.target + suffix);
  writeFileSync(f.store + suffix, '{}', { mode: 0o600 });
  assert.deepEqual(configureFreeChat(f.env), { reason: 'applied', sessionsApplied: 0, sessionsSkipped: 1 });
  assert.deepEqual(f.read(f.store), f.sessions);
});

test('symlinked config, backups and session directories are never followed', t => {
  const f = fixture(t);
  const other = join(f.state, 'other.json');
  writeFileSync(other, JSON.stringify(f.cfg));
  rmSync(f.target); symlinkSync(other, f.target);
  assert.deepEqual(configureFreeChat(f.env), { reason: 'skipped' });
  assert.deepEqual(f.read(other), f.cfg);
  rmSync(f.target); writeFileSync(f.target, JSON.stringify(f.cfg));
  symlinkSync(other, f.target + suffix);
  assert.deepEqual(configureFreeChat(f.env), { reason: 'backup_unavailable' });
  rmSync(f.target + suffix);
  const outside = join(f.state, 'outside'); mkdirSync(outside);
  writeFileSync(join(outside, 'sessions.json'), JSON.stringify(f.sessions));
  rmSync(join(f.state, 'agents', 'main', 'sessions'), { recursive: true });
  symlinkSync(outside, join(f.state, 'agents', 'main', 'sessions'));
  assert.deepEqual(configureFreeChat(f.env), { reason: 'applied', sessionsApplied: 0, sessionsSkipped: 0 });
  assert.deepEqual(f.read(join(outside, 'sessions.json')), f.sessions);
});
