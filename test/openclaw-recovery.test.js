import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync, statSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { recoverModel } = createRequire(import.meta.url)('../infra/openclaw/recover-model.cjs');
const inkling = 'openrouter/thinkingmachines/inkling:free';
const free = 'openrouter/openrouter/free';
function fixture(t, model = { primary: inkling, fallbacks: [] }) {
  const dir = mkdtempSync(join(tmpdir(), 'recovery-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const target = join(dir, 'openclaw.json');
  const cfg = { agents: { defaults: { model } }, plugins: { deny: ['user-choice'] } };
  writeFileSync(target, JSON.stringify(cfg));
  const env = { OPENCLAW_CONFIG_PATH: target, JARVIS_RECOVERY_MODEL: free };
  return { target, cfg, env, read: () => JSON.parse(readFileSync(target, 'utf8')) };
}
test('recovery requires opt-in and rejects paid or malformed models', t => {
  const f = fixture(t);
  for (const model of ['', 'openrouter/vendor/paid', 'openrouter/free', free + '\n', 'openrouter//:free']) {
    assert.notEqual(recoverModel({ ...f.env, JARVIS_RECOVERY_MODEL: model }), 'recovered');
    assert.deepEqual(f.read(), f.cfg);
  }
});
test('recovery preserves other settings and saves a private exact backup', t => {
  const f = fixture(t);
  const original = readFileSync(f.target, 'utf8');
  assert.equal(recoverModel(f.env), 'recovered');
  assert.deepEqual(f.read(), { ...f.cfg, agents: { defaults: { model: { primary: free, fallbacks: [] } } } });
  assert.equal(readFileSync(f.target + '.pre-jarvis-recovery', 'utf8'), original);
  assert.equal(statSync(f.target + '.pre-jarvis-recovery').mode & 0o777, 0o600);
  assert.equal(recoverModel(f.env), 'preserved_model');
});
test('recovery supports string defaults without modifying unrelated models', t => {
  const f = fixture(t, inkling);
  assert.equal(recoverModel(f.env), 'recovered');
  assert.equal(f.read().agents.defaults.model, free);
  assert.equal(recoverModel(f.env), 'preserved_model');
});
test('failed backup prevents any model change', t => {
  const f = fixture(t);
  mkdirSync(f.target + '.pre-jarvis-recovery');
  assert.equal(recoverModel(f.env), 'backup_unavailable');
  assert.deepEqual(f.read(), f.cfg);
});
test('conflicting backup, symlink, includes and restrictive catalogs remain untouched', t => {
  const f = fixture(t);
  writeFileSync(f.target + '.pre-jarvis-recovery', '{}', { mode: 0o600 });
  assert.equal(recoverModel(f.env), 'backup_unavailable');
  assert.deepEqual(f.read(), f.cfg);
  rmSync(f.target + '.pre-jarvis-recovery');
  symlinkSync(f.target, f.target + '.pre-jarvis-recovery');
  assert.equal(recoverModel(f.env), 'backup_unavailable');
  rmSync(f.target + '.pre-jarvis-recovery');
  f.cfg.agents.defaults.models = { [inkling]: {} };
  writeFileSync(f.target, JSON.stringify(f.cfg));
  assert.equal(recoverModel(f.env), 'model_not_allowlisted');
  f.cfg.agents.defaults.$include = 'other.json';
  writeFileSync(f.target, JSON.stringify(f.cfg));
  assert.equal(recoverModel(f.env), 'included_config');
  assert.deepEqual(f.read(), f.cfg);
});

test('paid Auto stays only when its opt-out is set', t => {
  const f = fixture(t, { primary: 'openrouter/openrouter/auto', fallbacks: [] });
  for (const flag of ['', '0', 'true']) {
    const copy = fixture(t, { primary: 'openrouter/openrouter/auto', fallbacks: [] });
    assert.equal(recoverModel({ ...copy.env, JARVIS_RECOVER_PAID_AUTO: flag }), 'preserved_model');
    assert.deepEqual(copy.read(), copy.cfg);
  }
  assert.equal(recoverModel({ ...f.env, JARVIS_RECOVER_PAID_AUTO: undefined }), 'recovered');
});
test('paid Auto recovery backs up exactly and preserves other agent and utility settings', t => {
  const f = fixture(t, { primary: 'openrouter/openrouter/auto', fallbacks: [inkling] });
  f.cfg.agents.defaults.utilityModel = inkling;
  f.cfg.agents.list = [{ id: 'other', model: 'openrouter/vendor/paid' }];
  writeFileSync(f.target, JSON.stringify(f.cfg));
  const original = readFileSync(f.target, 'utf8');
  const env = { ...f.env, JARVIS_RECOVER_PAID_AUTO: '1' };
  assert.equal(recoverModel(env), 'recovered');
  const expected = structuredClone(f.cfg);
  expected.agents.defaults.model.primary = free;
  assert.deepEqual(f.read(), expected);
  assert.equal(readFileSync(f.target + '.pre-jarvis-recovery', 'utf8'), original);
  assert.equal(statSync(f.target + '.pre-jarvis-recovery').mode & 0o777, 0o600);
  assert.equal(recoverModel(env), 'preserved_model');
});
test('paid Auto string defaults require a free destination', t => {
  const f = fixture(t, 'openrouter/openrouter/auto');
  const env = { ...f.env, JARVIS_RECOVER_PAID_AUTO: '1' };
  assert.equal(recoverModel({ ...env, JARVIS_RECOVERY_MODEL: 'openrouter/vendor/paid' }), 'invalid_model');
  assert.deepEqual(f.read(), f.cfg);
  assert.equal(recoverModel(env), 'recovered');
  assert.equal(f.read().agents.defaults.model, free);
});
test('paid Auto opt-in does not rewrite other defaults', t => {
  const f = fixture(t, 'openrouter/vendor/paid');
  assert.equal(recoverModel({ ...f.env, JARVIS_RECOVER_PAID_AUTO: '1' }), 'preserved_model');
  assert.deepEqual(f.read(), f.cfg);
});
test('paid Auto recovery respects catalog, include and backup safeguards', t => {
  const f = fixture(t, 'openrouter/openrouter/auto');
  const env = { ...f.env, JARVIS_RECOVER_PAID_AUTO: '1' };
  f.cfg.agents.defaults.models = { [inkling]: {} };
  writeFileSync(f.target, JSON.stringify(f.cfg));
  assert.equal(recoverModel(env), 'model_not_allowlisted');
  delete f.cfg.agents.defaults.models;
  f.cfg.models = { mode: 'replace' };
  writeFileSync(f.target, JSON.stringify(f.cfg));
  assert.equal(recoverModel(env), 'custom_catalog');
  delete f.cfg.models;
  f.cfg.agents.defaults.$include = 'defaults.json';
  writeFileSync(f.target, JSON.stringify(f.cfg));
  assert.equal(recoverModel(env), 'included_config');
  delete f.cfg.agents.defaults.$include;
  writeFileSync(f.target, JSON.stringify(f.cfg));
  writeFileSync(f.target + '.pre-jarvis-recovery', '{}', { mode: 0o600 });
  assert.equal(recoverModel(env), 'backup_unavailable');
  assert.deepEqual(f.read(), f.cfg);
});

const auto = 'openrouter/openrouter/auto';
test('startup migrates the OpenRouter Auto default, allowlist and fallbacks without a manual flag', t => {
  const f = fixture(t, { primary: auto, fallbacks: [auto, inkling] });
  delete f.env.JARVIS_RECOVERY_MODEL;
  delete f.env.JARVIS_RECOVER_PAID_AUTO;
  f.cfg.agents.defaults.models = { [auto]: { alias: 'Auto' } };
  f.cfg.agents.defaults.utilityModel = auto;
  f.cfg.agents.list = [{ id: 'main', model: auto }, { id: 'other', model: 'openrouter/vendor/paid' }];
  f.cfg.secrets = { providers: { openrouter: { source: 'env', allowlist: ['OPENROUTER_API_KEY'] } } };
  writeFileSync(f.target, JSON.stringify(f.cfg));
  assert.equal(recoverModel(f.env), 'recovered');
  const next = f.read();
  assert.equal(next.agents.defaults.model.primary, free);
  assert.deepEqual(next.agents.defaults.model.fallbacks, [free, inkling]);
  assert.deepEqual(next.agents.defaults.models, { [free]: {} });
  assert.equal(next.agents.defaults.utilityModel, free);
  assert.equal(next.agents.list[0].model, free);
  assert.equal(next.agents.list[1].model, 'openrouter/vendor/paid');
  assert.deepEqual(next.secrets, f.cfg.secrets);
  assert.equal(recoverModel(f.env), 'preserved_model');
});

test('session pins of paid Auto move to the free route and conversation text stays', t => {
  const f = fixture(t, free);
  delete f.env.JARVIS_RECOVERY_MODEL;
  const state = join(f.target, '..');
  const store = join(state, 'agents', 'main', 'sessions', 'sessions.json');
  mkdirSync(join(state, 'agents', 'main', 'sessions'), { recursive: true });
  const sessions = {
    'agent:main:main': {
      model: auto,
      modelOverride: auto,
      systemPromptReport: { model: auto, prompt: 'keep ' + auto },
      messages: [{ content: auto }]
    },
    'agent:main:free': { modelOverride: inkling, transcript: auto }
  };
  writeFileSync(store, JSON.stringify(sessions));
  const env = { ...f.env, OPENCLAW_STATE_DIR: state };
  assert.equal(recoverModel(env), 'sessions_recovered');
  const next = JSON.parse(readFileSync(store, 'utf8'));
  assert.equal(next['agent:main:main'].model, free);
  assert.equal(next['agent:main:main'].modelOverride, free);
  assert.equal(next['agent:main:main'].systemPromptReport.model, free);
  assert.equal(next['agent:main:main'].systemPromptReport.prompt, 'keep ' + auto);
  assert.equal(next['agent:main:main'].messages[0].content, auto);
  assert.equal(next['agent:main:free'].modelOverride, inkling);
  assert.equal(next['agent:main:free'].transcript, auto);
  assert.equal(readFileSync(store + '.pre-jarvis-recovery', 'utf8'), JSON.stringify(sessions));
  assert.equal(statSync(store + '.pre-jarvis-recovery').mode & 0o777, 0o600);
  assert.deepEqual(f.read(), f.cfg);
  assert.equal(recoverModel(env), 'preserved_model');
});

test('opting out keeps paid Auto session pins', t => {
  const f = fixture(t, auto);
  const state = join(f.target, '..');
  const store = join(state, 'agents', 'main', 'sessions', 'sessions.json');
  mkdirSync(join(state, 'agents', 'main', 'sessions'), { recursive: true });
  writeFileSync(store, JSON.stringify({ 'agent:main:main': { modelOverride: auto } }));
  assert.equal(recoverModel({ ...f.env, JARVIS_RECOVER_PAID_AUTO: '0', OPENCLAW_STATE_DIR: state }), 'preserved_model');
  assert.equal(f.read().agents.defaults.model, auto);
  assert.equal(JSON.parse(readFileSync(store, 'utf8'))['agent:main:main'].modelOverride, auto);
});

test('canonical OpenRouter Auto aliases migrate across configured slots', t => {
  for (const alias of ['openrouter/auto', 'openrouter:auto', ' openrouter/auto ']) {
    const f = fixture(t, { primary: alias, fallbacks: [alias, free] });
    f.cfg.agents.defaults.models = { [alias]: {}, [free]: { alias: 'Keep this', params: { temperature: 0.4 } } };
    f.cfg.agents.defaults.utilityModel = alias;
    f.cfg.agents.defaults.mediaModels = { image: alias };
    f.cfg.agents.list = [{ id: 'main', model: alias }];
    writeFileSync(f.target, JSON.stringify(f.cfg));
    assert.equal(recoverModel(f.env), 'recovered');
    const result = f.read().agents;
    assert.equal(result.defaults.model.primary, free);
    assert.deepEqual(result.defaults.model.fallbacks, [free]);
    assert.equal(result.defaults.utilityModel, free);
    assert.equal(result.defaults.mediaModels.image, free);
    assert.equal(result.list[0].model, free);
    assert.deepEqual(result.defaults.models, { [free]: { alias: 'Keep this', params: { temperature: 0.4 } } });
    assert.equal(recoverModel(f.env), 'preserved_model');
  }
});
test('Auto alias matching preserves other providers and respects safeguards', t => {
  for (const other of ['auto', 'other/auto', 'openrouter/vendor/auto', 'openrouter/autonomous']) {
    const f = fixture(t, other);
    assert.equal(recoverModel(f.env), 'preserved_model');
    assert.deepEqual(f.read(), f.cfg);
  }
  const disabled = fixture(t, 'openrouter/auto');
  assert.equal(recoverModel({ ...disabled.env, JARVIS_RECOVER_PAID_AUTO: '0' }), 'preserved_model');
  const blocked = fixture(t, 'openrouter:auto');
  mkdirSync(blocked.target + '.pre-jarvis-recovery');
  assert.equal(recoverModel(blocked.env), 'backup_unavailable');
  assert.deepEqual(blocked.read(), blocked.cfg);
});
