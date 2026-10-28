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
