// Issue #166: read-only, redacted diagnostic for free-route thinking and backup gates.
// Never prints credentials, paths, session IDs, transcripts, or full configuration.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { readRegular, sessionStores } = require('./recover-model.cjs');
const { planConfig } = require('./configure-free-chat.cjs');
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
function diagnose(env = process.env) {
  const stateDir = env.OPENCLAW_STATE_DIR || '/data/.openclaw';
  const configFile = env.OPENCLAW_CONFIG_PATH || path.join(stateDir, 'openclaw.json');
  const result = {
    config: 'unavailable', freeRoute: 'unknown', defaultThinking: 'unknown',
    configBackup: backupState(configFile), plan: 'unknown',
    jsonSessionStores: 0, sessionThinking: { off: 0, minimal: 0, other: 0, unset: 0 },
    lockedSessions: 0, sessionBackupsPresent: 0, unreadableStores: 0,
    sqliteSessionState: 'not_inspected',
    note: 'JSON session counts are not proof of the active SQLite session state'
  };
  try {
    const config = JSON.parse(readRegular(configFile));
    result.config = 'readable';
    const primary = config.agents?.defaults?.model;
    const model = typeof primary === 'string' ? primary : primary?.primary;
    result.freeRoute = model === 'openrouter/openrouter/free' ? 'selected' : 'not_selected';
    const thinking = config.agents?.defaults?.thinkingDefault;
    result.defaultThinking = ['off', 'minimal', 'low', 'medium', 'high'].includes(thinking)
      ? thinking : thinking == null ? 'unset' : 'other';
    result.plan = planConfig(config) ? 'supported' : 'unsupported';
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
  return result;
}
if (require.main === module) {
  console.log('[JARVIS] Redacted issue-166 diagnostics: ' + JSON.stringify(diagnose()));
}
module.exports = { diagnose, backupState };
