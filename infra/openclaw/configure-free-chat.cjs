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
    const updates = [];
    for (const row of db.prepare('SELECT session_key, entry_json FROM session_nodes').all()) {
      let parsed;
      try { parsed = JSON.parse(row.entry_json); } catch { return 'skipped'; }
      if (!record(parsed)) continue;
      const planned = planSessions({ entry: parsed }, options).entry;
      if (JSON.stringify(parsed) === JSON.stringify(planned)) continue;
      updates.push({ key: row.session_key, original: row.entry_json, next: JSON.stringify(planned) });
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
    const update = db.prepare('UPDATE session_nodes SET entry_json = ? WHERE session_key = ? AND entry_json = ?');
    db.exec('BEGIN IMMEDIATE');
    try {
      for (const row of updates) {
        if (update.run(row.next, row.key, row.original).changes !== 1) throw new Error('conflict');
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

function save(file, original, next) {
  if (JSON.stringify(JSON.parse(original)) === JSON.stringify(next)) return 'unchanged';
  if (!savePrivateBackup(file, original, BACKUP)) return 'backup_unavailable';
  return replaceJson(file, original, next) ? 'applied' : 'changed_during_read';
}

function configureFreeChat(env = process.env) {
  const profile = env.JARVIS_FREE_CHAT_PROFILE === '1';
  const sqliteOnly = env.JARVIS_RELEASE_SQLITE_PINS === '1';
  if (!profile && !sqliteOnly) return { reason: 'disabled' };
  const target = env.OPENCLAW_CONFIG_PATH || path.join(env.OPENCLAW_STATE_DIR || '/data/.openclaw', 'openclaw.json');
  try {
    const original = readRegular(target);
    const parsed = JSON.parse(original);
    const next = planConfig(parsed);
    if (!next) return { reason: 'unsupported_config' };
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
    const stateDir = env.OPENCLAW_STATE_DIR ||
      (path.basename(path.dirname(target)) === '.openclaw' ? path.dirname(target) : null);
    for (const file of sqliteSessionFiles(stateDir, profile ? next : parsed)) {
      const result = releaseSqliteFile(file, sessionOptions);
      if (result === 'applied') sqliteApplied += 1;
      else if (result !== 'unchanged') sqliteSkipped += 1;
    }
    return { reason: config, sessionsApplied, sessionsSkipped, sqliteApplied, sqliteSkipped };
  } catch {
    return { reason: 'skipped' };
  }
}

module.exports = { configureFreeChat, planConfig, planSessions, sqliteSessionFiles };
if (require.main === module) console.log('[JARVIS] Free chat profile: ' + JSON.stringify(configureFreeChat()) + '.');
