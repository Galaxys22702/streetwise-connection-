import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const { diagnose, backupState } = require('../infra/openclaw/diagnose-issue-166.cjs');
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'jarvis-166-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const state = join(root, '.openclaw');
  const config = join(state, 'openclaw.json');
  mkdirSync(state);
  return { root, state, config, env: { OPENCLAW_STATE_DIR: state, OPENCLAW_CONFIG_PATH: config } };
}
test('diagnostics only reports aggregate state and never secrets or transcripts', t => {
  const f = fixture(t);
  writeFileSync(f.config, JSON.stringify({ agents: { defaults: { model: 'openrouter/openrouter/free', thinkingDefault: 'minimal' } }, secret: 'DO_NOT_PRINT_SECRET' }));
  const dir = join(f.state, 'agents', 'main', 'sessions');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, 'sessions.json');
  writeFileSync(file, JSON.stringify({
    'PRIVATE_SESSION_ID': { thinkingLevel: 'high', messages: ['DO_NOT_PRINT_TRANSCRIPT'] },
    locked: { modelSelectionLocked: true, thinkingLevel: 'off' },
    inherited: {}
  }));
  const result = diagnose(f.env);
  assert.equal(result.config, 'readable');
  assert.equal(result.freeRoute, 'selected');
  assert.equal(result.defaultThinking, 'minimal');
  assert.equal(result.sessionThinking.other, 1);
  assert.equal(result.sessionThinking.off, 1);
  assert.equal(result.sessionThinking.unset, 1);
  assert.equal(result.lockedSessions, 1);
  assert.equal(result.sqliteSessionState, 'not_inspected');
  const serialized = JSON.stringify(result);
  for (const forbidden of ['DO_NOT_PRINT_SECRET', 'DO_NOT_PRINT_TRANSCRIPT', 'PRIVATE_SESSION_ID', f.root]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});
test('backup states reject unsafe backups and only count private backups', t => {
  const f = fixture(t);
  writeFileSync(f.config, JSON.stringify({ agents: { defaults: { model: 'openrouter/openrouter/free' } } }));
  assert.equal(backupState(f.config), 'absent');
  writeFileSync(f.config + '.pre-jarvis-free-chat-v1', '{}', { mode: 0o600 });
  assert.equal(backupState(f.config), 'exists_private');
  chmodSync(f.config + '.pre-jarvis-free-chat-v1', 0o644);
  assert.equal(backupState(f.config), 'permissions_not_private');
});
test('malformed session JSON is counted without revealing its contents', t => {
  const f = fixture(t);
  writeFileSync(f.config, JSON.stringify({ agents: { defaults: { model: 'openrouter/openrouter/free' } } }));
  const dir = join(f.state, 'agents', 'main', 'sessions');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'sessions.json'), '{PRIVATE_BAD_DATA');
  const result = diagnose(f.env);
  assert.equal(result.unreadableStores, 1);
  assert.equal(JSON.stringify(result).includes('PRIVATE_BAD_DATA'), false);
});
