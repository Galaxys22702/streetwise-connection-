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
  assert.equal(result.sqliteSessionState, 'not_found');
  assert.equal(result.configChangeRequired, true);
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

test('read-only SQLite scan counts canonical session metadata without exposing contents', t => {
  const f = fixture(t);
  writeFileSync(f.config, JSON.stringify({
    agents: { defaults: { model: 'openrouter/openrouter/free', thinkingDefault: 'minimal' } }
  }));
  const dir = join(f.state, 'agents', 'main', 'agent');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, 'openclaw-agent.sqlite');
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(file);
  db.exec('CREATE TABLE session_nodes (entry_json TEXT, entry_valid INTEGER)');
  const insert = db.prepare('INSERT INTO session_nodes (entry_json, entry_valid) VALUES (?, ?)');
  insert.run(JSON.stringify({ thinkingLevel: 'off', modelSelectionLocked: true, sessionId: 'HIDDEN_ID', messages: ['HIDDEN_TRANSCRIPT'] }), 1);
  insert.run(JSON.stringify({ thinkingLevel: 'minimal' }), 1);
  insert.run(JSON.stringify({ thinkingLevel: 'high' }), 1);
  insert.run(JSON.stringify({}), 1);
  insert.run('{HIDDEN_INVALID', 1);
  insert.run(JSON.stringify({ thinkingLevel: 'off' }), 0);
  db.close();
  const result = diagnose(f.env);
  assert.equal(result.sqliteSessionState, 'inspected');
  assert.equal(result.sqliteStores, 1);
  assert.deepEqual(result.sqliteSessionThinking, { off: 1, minimal: 1, other: 1, unset: 1 });
  assert.equal(result.sqliteLockedSessions, 1);
  assert.equal(result.sqliteInvalidRows, 2);
  for (const secret of ['HIDDEN_ID', 'HIDDEN_TRANSCRIPT', 'HIDDEN_INVALID', f.root]) {
    assert.equal(JSON.stringify(result).includes(secret), false);
  }
});

test('missing SQLite session table stays unavailable without exposing DB metadata', t => {
  const f = fixture(t);
  writeFileSync(f.config, JSON.stringify({
    agents: { defaults: { model: 'openrouter/openrouter/free' } }
  }));
  const dir = join(f.state, 'agents', 'main', 'agent');
  mkdirSync(dir, { recursive: true });
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(join(dir, 'openclaw-agent.sqlite'));
  db.exec('CREATE TABLE unrelated (secret TEXT)');
  db.close();
  const result = diagnose(f.env);
  assert.equal(result.sqliteStores, 1);
  assert.equal(result.sqliteUnreadableStores, 1);
  assert.equal(result.sqliteSessionState, 'unavailable');
});
