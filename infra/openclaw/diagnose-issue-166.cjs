// Issue #166: read-only, redacted diagnostic for free-route thinking and backup gates.
// Never prints credentials, paths, session IDs, transcripts, or full configuration.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { readRegular, sessionStores } = require('./recover-model.cjs');
const { planConfig, sqliteSessionFiles } = require('./configure-free-chat.cjs');
const BACKUP = '.pre-jarvis-free-chat-v1';
function backupState(file) {
  try {
    const stat = fs.lstatSync(file + BACKUP);
    return stat.isSymbolicLink() ? 'unsafe_symlink' :
      !stat.isFile() ? 'not_regular' :
      (stat.mode & 0o077) !== 0 ? 'permissions_not_private' : 'exists_private';
  } catch (e) {
    return e.code === 'ENOENT' ? 'absent' : 'inaccessible';
  }
}
// Query only the two diagnostic metadata fields; do not load session content,
// transcript rows, session IDs or arbitrary SQL from the persisted database.
function inspectSqlite(file) {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(file, { readOnly: true, timeout: 2000 });
  try {
    const cols = new Set(db.prepare('PRAGMA table_info(session_nodes)').all().map(row => row.name));
    if (!cols.has('entry_json') || !cols.has('entry_valid')) return null;
    // CASE protects json_extract from damaged/invalid JSON rows.
    const rows = db.prepare(`SELECT
      CASE WHEN entry_valid = 1 AND json_valid(entry_json)
        THEN json_extract(entry_json, '$.thinkingLevel') ELSE NULL END AS thinking,
      CASE WHEN entry_valid = 1 AND json_valid(entry_json)
        THEN json_extract(entry_json, '$.modelSelectionLocked') ELSE NULL END AS locked,
      entry_valid AS valid, json_valid(entry_json) AS validJson
      FROM session_nodes`).iterate();
    const summary = { off: 0, minimal: 0, other: 0, unset: 0, locked: 0, invalid: 0 };
    for (const row of rows) {
      if (row.valid !== 1 || row.validJson !== 1) { summary.invalid++; continue; }
      const level = row.thinking;
      const bucket = level == null ? 'unset' : level === 'off' || level === 'minimal' ? level : 'other';
      summary[bucket]++;
      if (row.locked === 1 || row.locked === 'true') summary.locked++;
    }
    return summary;
  } finally { db.close(); }
}
function diagnose(env = process.env) {
  const stateDir = env.OPENCLAW_STATE_DIR || '/data/.openclaw';
  const configFile = env.OPENCLAW_CONFIG_PATH || path.join(stateDir, 'openclaw.json');
  const result = {
    config: 'unavailable', freeRoute: 'unknown', defaultThinking: 'unknown',
    configBackup: backupState(configFile), plan: 'unknown', configChangeRequired: 'unknown',
    jsonSessionStores: 0, sessionThinking: { off: 0, minimal: 0, other: 0, unset: 0 },
    lockedSessions: 0, sessionBackupsPresent: 0, unreadableStores: 0,
    sqliteSessionState: 'not_found', sqliteStores: 0, sqliteUnreadableStores: 0,
    sqliteBackupsPresent: 0, sqliteSessionThinking: { off: 0, minimal: 0, other: 0, unset: 0 },
    sqliteLockedSessions: 0, sqliteInvalidRows: 0,
    note: 'Read-only aggregate counts do not reveal which session caused a past provider request'
  };
  let parsedConfig = null;
  try {
    const config = JSON.parse(readRegular(configFile));
    parsedConfig = config;
    result.config = 'readable';
    const primary = config.agents?.defaults?.model;
    const model = typeof primary === 'string' ? primary : primary?.primary;
    result.freeRoute = model === 'openrouter/openrouter/free' ? 'selected' : 'not_selected';
    const thinking = config.agents?.defaults?.thinkingDefault;
    result.defaultThinking = ['off', 'minimal', 'low', 'medium', 'high'].includes(thinking)
      ? thinking : thinking == null ? 'unset' : 'other';
    const planned = planConfig(config);
    result.plan = planned ? 'supported' : 'unsupported';
    if (planned) result.configChangeRequired = JSON.stringify(planned) !== JSON.stringify(config);
  } catch { result.config = 'unavailable'; }
  for (const file of sessionStores(stateDir)) {
    result.jsonSessionStores++;
    if (backupState(file) === 'exists_private') result.sessionBackupsPresent++;
    try {
      const entries = JSON.parse(readRegular(file));
      if (!entries || typeof entries !== 'object' || Array.isArray(entries)) throw Error('invalid');
      for (const entry of Object.values(entries)) {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
        if (entry.modelSelectionLocked) result.lockedSessions++;
        const level = entry.thinkingLevel;
        const bucket = level == null ? 'unset' : level === 'off' || level === 'minimal' ? level : 'other';
        result.sessionThinking[bucket]++;
      }
    } catch { result.unreadableStores++; }
  }
  for (const file of sqliteSessionFiles(stateDir, parsedConfig)) {
    result.sqliteStores++;
    if (backupState(file) === 'exists_private') result.sqliteBackupsPresent++;
    try {
      const counts = inspectSqlite(file);
      if (!counts) { result.sqliteUnreadableStores++; continue; }
      for (const key of Object.keys(result.sqliteSessionThinking)) {
        result.sqliteSessionThinking[key] += counts[key];
      }
      result.sqliteLockedSessions += counts.locked;
      result.sqliteInvalidRows += counts.invalid;
      result.sqliteSessionState = 'inspected';
    } catch { result.sqliteUnreadableStores++; }
  }
  if (result.sqliteStores && result.sqliteUnreadableStores && result.sqliteSessionState !== 'inspected') {
    result.sqliteSessionState = 'unavailable';
  }
  return result;
}
if (require.main === module) {
  console.log('[JARVIS] Redacted issue-166 diagnostics: ' + JSON.stringify(diagnose()));
}
module.exports = { diagnose, backupState };
