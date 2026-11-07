// One-time, owner-enabled tuning for the known free-router/Inkling installation.
const fs = require('node:fs');
const path = require('node:path');
const { readRegular, savePrivateBackup, replaceJson, sessionStores, isValidFree, isPaidAuto } = require('./recover-model.cjs');
const FREE = 'openrouter/openrouter/free';
const INKLING = 'openrouter/thinkingmachines/inkling:free';
const BACKUP = '.pre-jarvis-free-chat-v1';
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function includesConfig(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.hasOwn(value, '$include') || Object.values(value).some(includesConfig);
}

function planConfig(cfg) {
  if (!record(cfg) || includesConfig(cfg) || cfg.models?.mode === 'replace') return null;
  const defaults = cfg.agents?.defaults;
  if (!record(defaults)) return null;
  // Removing a session pin must not expose a different per-agent model (which
  // may be paid). Custom agent routing needs a separate, explicit review.
  if (cfg.agents.list != null && (!Array.isArray(cfg.agents.list) ||
      cfg.agents.list.some(agent => !record(agent) || agent.model != null))) return null;
  if (cfg.agents.entries != null && (!record(cfg.agents.entries) ||
      Object.values(cfg.agents.entries).some(agent => !record(agent) || agent.model != null))) return null;
  const model = defaults.model;
  const primary = typeof model === 'string' ? model : model?.primary;
  if (![FREE, INKLING].includes(primary)) return null;
  if (record(model) && model.fallbacks != null &&
      (!Array.isArray(model.fallbacks) || !model.fallbacks.every(isValidFree))) return null;
  if (defaults.models != null && (!record(defaults.models) ||
      (Object.keys(defaults.models).length && !Object.hasOwn(defaults.models, FREE) &&
       !Object.hasOwn(defaults.models, INKLING)))) return null;
  if (defaults.heartbeat != null && !record(defaults.heartbeat)) return null;

  const next = structuredClone(cfg);
  const tuned = next.agents.defaults;
  tuned.model = typeof model === 'string' ? FREE : {
    ...model,
    primary: FREE,
    // Never retry the failing Inkling route, or the primary against itself.
    fallbacks: [...new Set((model.fallbacks || []).filter(ref => ref !== INKLING && ref !== FREE))]
  };
  if (record(tuned.models) && Object.hasOwn(tuned.models, INKLING)) {
    if (!Object.hasOwn(tuned.models, FREE)) tuned.models[FREE] = {};
  }
  // The deployed free endpoint rejects thinking=off. Minimal retains reasoning.
  tuned.thinkingDefault = 'minimal';
  // Bound repeated failures without lengthening an owner's tighter deadline.
  tuned.timeoutSeconds = Number.isInteger(tuned.timeoutSeconds) && tuned.timeoutSeconds > 0
    ? Math.min(tuned.timeoutSeconds, 120) : 120;
  // Save scarce free requests for foreground chat. Keep custom heartbeat details.
  tuned.heartbeat = { ...tuned.heartbeat, every: '0m' };
  return next;
}

function fullRoute(model, provider) {
  if (typeof model !== 'string') return null;
  const value = model.trim();
  if (provider && provider !== 'openrouter') return null;
  if (isPaidAuto(value)) return 'openrouter/openrouter/auto';
  if ([FREE, INKLING].includes(value)) return value;
  if (provider === 'openrouter') return 'openrouter/' + value;
  return null;
}

function planSessions(sessions, { recoverPaidAuto = false } = {}) {
  if (!record(sessions)) return null;
  const next = structuredClone(sessions);
  for (const entry of Object.values(next)) {
    if (!record(entry) || entry.modelSelectionLocked || entry.acp || entry.modelFallback) continue;
    const hasOverride = entry.modelOverride != null || entry.providerOverride != null;
    const selected = hasOverride
      ? fullRoute(entry.modelOverride, entry.providerOverride)
      : fullRoute(entry.model, entry.modelProvider);
    const recoverable = value => [FREE, INKLING].includes(value) || (recoverPaidAuto && isPaidAuto(value));
    if (!recoverable(selected)) continue;
    // Inherit the configured free default: an explicit session model pin disables
    // configured fallback behavior in this OpenClaw version.
    for (const key of ['modelOverride', 'providerOverride', 'modelOverrideSource',
      'modelOverrideRouteResolution', 'modelOverrideFallbackOriginProvider',
      'modelOverrideFallbackOriginModel']) delete entry[key];
    if (recoverable(fullRoute(entry.model, entry.modelProvider))) {
      entry.model = 'openrouter/free';
      entry.modelProvider = 'openrouter';
    }
    entry.thinkingLevel = 'minimal';
  }
  return next;
}

function regularDatabase(file) {
  try {
    const parent = fs.lstatSync(path.dirname(file));
    const info = fs.lstatSync(file);
    if (!parent.isDirectory() || parent.isSymbolicLink()) return false;
    return info.isFile() && !info.isSymbolicLink() && info.size <= 256_000_000;
  } catch {
    return false;
  }
}

function addSqlite(files, seen, file) {
  if (path.basename(file) !== 'openclaw-agent.sqlite' || !regularDatabase(file)) return;
  const resolved = path.resolve(file);
  if (seen.has(resolved)) return;
  seen.add(resolved);
  files.push(resolved);
}

function sqliteSessionFiles(stateDir, cfg) {
  const files = [];
  const seen = new Set();
  if (stateDir) {
    const agentsDir = path.join(stateDir, 'agents');
    let agents = [];
    try {
      const info = fs.lstatSync(agentsDir);
      if (info.isDirectory() && !info.isSymbolicLink()) agents = fs.readdirSync(agentsDir, { withFileTypes: true });
    } catch { /* no canonical agent tree */ }
    for (const agent of agents) {
      if (!agent.isDirectory() || agent.isSymbolicLink()) continue;
      addSqlite(files, seen, path.join(agentsDir, agent.name, 'agent', 'openclaw-agent.sqlite'));
    }
  }
  const dirs = [];
  if (Array.isArray(cfg?.agents?.list)) {
    for (const agent of cfg.agents.list) if (record(agent) && typeof agent.agentDir === 'string') dirs.push(agent.agentDir);
  }
  if (record(cfg?.agents?.entries)) {
    for (const agent of Object.values(cfg.agents.entries)) {
      if (record(agent) && typeof agent.agentDir === 'string') dirs.push(agent.agentDir);
    }
  }
  for (const dir of dirs) {
    if (!dir.trim() || dir.includes('\0')) continue;
    const base = path.isAbsolute(dir) ? dir : stateDir ? path.resolve(stateDir, dir) : null;
    if (base) addSqlite(files, seen, path.join(base, 'openclaw-agent.sqlite'));
  }
  return files;
}

function releaseSqliteFile(file, options) {
  let sqlite;
  try { sqlite = require('node:sqlite'); } catch { return 'skipped'; }
  let db;
  try {
    db = new sqlite.DatabaseSync(file, { timeout: 2000 });
    const table = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'session_nodes'").get();
    if (!table || !String(table.sql).includes('entry_json')) return 'skipped';
    const columns = new Set(db.prepare('PRAGMA table_info(session_nodes)').all().map(row => row.name));
    if (!['entry_valid', 'current_session_id', 'updated_at'].every(name => columns.has(name))) return 'skipped';
    const updates = [];
    for (const row of db.prepare('SELECT * FROM session_nodes').all()) {
      let parsed;
      try { parsed = JSON.parse(row.entry_json); } catch { return 'skipped'; }
      if (!record(parsed)) continue;
      const planned = planSessions({ entry: parsed }, options).entry;
      if (JSON.stringify(parsed) === JSON.stringify(planned)) continue;
      if (row.entry_valid !== 1 || !validIdentity(row, parsed) || !validIdentity(row, planned)) return 'skipped';
      updates.push({ key: row.session_key, original: row.entry_json, next: JSON.stringify(planned), before: row });
    }
    if (!updates.length) return 'unchanged';
    const backup = file + BACKUP;
    let backupInfo = null;
    try { backupInfo = fs.lstatSync(backup); } catch { /* first release creates the snapshot */ }
    // Entry metadata alone cannot prove an existing snapshot still contains all
    // current transcripts. Never reuse or overwrite it for another mutation.
    if (backupInfo) return 'backup_unavailable';
    // SQLite accepts an existing empty destination. Reserve it privately before
    // VACUUM writes any conversations, rather than chmod after writing them.
    fs.closeSync(fs.openSync(backup, 'wx', 0o600));
    db.exec("VACUUM INTO '" + backup.replaceAll("'", "''") + "'");
    const created = fs.lstatSync(backup);
    if (created.isSymbolicLink() || !created.isFile() || (created.mode & 0o077) !== 0) return 'backup_unavailable';
    const update = db.prepare('UPDATE session_nodes SET entry_json = ? WHERE session_key = ? AND entry_json = ? AND entry_valid = 1');
    const certify = db.prepare('UPDATE session_nodes SET entry_valid = 1 WHERE session_key = ? AND entry_json = ?');
    db.exec('BEGIN IMMEDIATE');
    try {
      for (const row of updates) {
        if (JSON.stringify(db.prepare('SELECT * FROM session_nodes WHERE session_key = ?').get(row.key)) !== JSON.stringify(row.before)) throw new Error('conflict');
        if (update.run(row.next, row.key, row.original).changes !== 1) throw new Error('conflict');
        // OpenClaw's AFTER UPDATE OF entry_json trigger resets entry_valid to 0.
        // Its native writer recertifies after an identity-preserving rewrite.
        if (certify.run(row.key, row.next).changes !== 1) throw new Error('certification_failed');
      }
      db.exec('COMMIT');
    } catch {
      try { db.exec('ROLLBACK'); } catch { /* the update did not commit */ }
      return 'skipped';
    }
    return 'applied';
  } catch {
    return 'skipped';
  } finally {
    if (db) try { db.close(); } catch { /* already closed */ }
  }
}

function validIdentity(row, entry) {
  return typeof entry.sessionId === 'string' && entry.sessionId === row.current_session_id &&
    typeof entry.updatedAt === 'number' && Number.isFinite(entry.updatedAt) && entry.updatedAt === row.updated_at;
}

// Recover only the exact model-only rewrite produced by our earlier migration.
// A previously certified snapshot is the authority; unrelated invalid rows are
// never marked valid. Neither JSON nor transcript/history tables are rewritten.
function certifyKnownSqliteRepairs(stateDir, cfg) {
  let sqliteCertified = 0;
  let certificationSkipped = 0;
  for (const file of sqliteSessionFiles(stateDir, cfg)) {
    const backup = file + BACKUP;
    let db, prior;
    try {
      if (!regularDatabase(backup) || (fs.lstatSync(backup).mode & 0o077) !== 0) continue;
      const { DatabaseSync } = require('node:sqlite');
      db = new DatabaseSync(file, { timeout: 2000 });
      prior = new DatabaseSync(backup, { readOnly: true, timeout: 2000 });
      const before = new Map(prior.prepare('SELECT * FROM session_nodes').all().map(row => [row.session_key, row]));
      const candidates = [];
      for (const row of db.prepare('SELECT * FROM session_nodes WHERE entry_valid = 0').all()) {
        const original = before.get(row.session_key);
        if (!original || original.entry_valid !== 1 || Object.keys(original).length !== Object.keys(row).length || Object.keys(original).some(key =>
          !['entry_json', 'entry_valid'].includes(key) && original[key] !== row[key])) continue;
        const parsed = JSON.parse(original.entry_json);
        const planned = planSessions({ entry: parsed }, { recoverPaidAuto: true }).entry;
        if (!validIdentity(original, parsed) || !validIdentity(row, planned) ||
            JSON.stringify(parsed) === JSON.stringify(planned) || JSON.stringify(planned) !== row.entry_json) continue;
        candidates.push(row);
      }
      if (!candidates.length) continue;
      const certify = db.prepare('UPDATE session_nodes SET entry_valid = 1 WHERE session_key = ? AND entry_json = ? AND entry_valid = 0 AND current_session_id = ? AND updated_at = ?');
      db.exec('BEGIN IMMEDIATE');
      try {
        for (const row of candidates) {
          if (JSON.stringify(db.prepare('SELECT * FROM session_nodes WHERE session_key = ?').get(row.session_key)) !== JSON.stringify(row)) throw new Error('conflict');
          if (certify.run(row.session_key, row.entry_json, row.current_session_id, row.updated_at).changes !== 1) throw new Error('conflict');
        }
        db.exec('COMMIT');
      } catch (error) {
        try { db.exec('ROLLBACK'); } catch { /* no certification committed */ }
        throw error;
      }
      sqliteCertified += 1;
    } catch { certificationSkipped += 1; }
    finally {
      if (prior) try { prior.close(); } catch { /* closed */ }
      if (db) try { db.close(); } catch { /* closed */ }
    }
  }
  return { sqliteCertified, certificationSkipped };
}

function save(file, original, next) {
  if (JSON.stringify(JSON.parse(original)) === JSON.stringify(next)) return 'unchanged';
  if (!savePrivateBackup(file, original, BACKUP)) return 'backup_unavailable';
  return replaceJson(file, original, next) ? 'applied' : 'changed_during_read';
}

function configureFreeChat(env = process.env) {
  const profile = env.JARVIS_FREE_CHAT_PROFILE === '1';
  const sqliteOnly = env.JARVIS_RELEASE_SQLITE_PINS === '1';
  const target = env.OPENCLAW_CONFIG_PATH || path.join(env.OPENCLAW_STATE_DIR || '/data/.openclaw', 'openclaw.json');
  try {
    const original = readRegular(target);
    const parsed = JSON.parse(original);
    const next = planConfig(parsed);
    if (!next) return { reason: profile || sqliteOnly ? 'unsupported_config' : 'disabled' };
    const stateDir = env.OPENCLAW_STATE_DIR ||
      (path.basename(path.dirname(target)) === '.openclaw' ? path.dirname(target) : null);
    const certification = certifyKnownSqliteRepairs(stateDir, parsed);
    if (!profile && !sqliteOnly) return certification.sqliteCertified || certification.certificationSkipped
      ? { reason: 'sqlite_certification_repair', ...certification } : { reason: 'disabled' };
    const sessionOptions = { recoverPaidAuto: env.JARVIS_RECOVER_PAID_AUTO === undefined || env.JARVIS_RECOVER_PAID_AUTO === '1' };
    let config = 'unchanged';
    let sessionsApplied = 0;
    let sessionsSkipped = 0;
    if (profile) {
      config = save(target, original, next);
      if (!['applied', 'unchanged'].includes(config)) return { reason: config };
      // An arbitrary custom config path does not imply ownership of nearby sessions.
      const stateDir = env.OPENCLAW_STATE_DIR ||
        (path.basename(path.dirname(target)) === '.openclaw' ? path.dirname(target) : null);
      for (const file of sessionStores(stateDir)) {
        try {
          const sessionOriginal = readRegular(file);
          const planned = planSessions(JSON.parse(sessionOriginal), sessionOptions);
          if (!planned) { sessionsSkipped += 1; continue; }
          const result = save(file, sessionOriginal, planned);
          if (result === 'applied') sessionsApplied += 1;
          else if (result !== 'unchanged') sessionsSkipped += 1;
        } catch { sessionsSkipped += 1; }
      }
    }
    let sqliteApplied = 0;
    let sqliteSkipped = 0;
    for (const file of sqliteSessionFiles(stateDir, profile ? next : parsed)) {
      const result = releaseSqliteFile(file, sessionOptions);
      if (result === 'applied') sqliteApplied += 1;
      else if (result !== 'unchanged') sqliteSkipped += 1;
    }
    return { reason: config, sessionsApplied, sessionsSkipped, sqliteApplied, sqliteSkipped };
  } catch {
    return { reason: profile || sqliteOnly ? 'skipped' : 'disabled' };
  }
}

module.exports = { configureFreeChat, planConfig, planSessions, sqliteSessionFiles };
if (require.main === module) console.log('[JARVIS] Free chat profile: ' + JSON.stringify(configureFreeChat()) + '.');
