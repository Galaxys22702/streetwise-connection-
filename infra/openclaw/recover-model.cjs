// Explicit recovery only; never select a paid model or overwrite credentials.
const fs = require('node:fs');
const path = require('node:path');
const PAID_AUTO = 'openrouter/openrouter/auto';
// OpenClaw v2026.9.9 parseModelRef + built-in OpenRouter normalization.
const AUTO_REFS = new Set([PAID_AUTO, 'openrouter/auto', 'openrouter:auto']);
const isPaidAuto = value => typeof value === 'string' && AUTO_REFS.has(value.trim());
const INKLING = 'openrouter/thinkingmachines/inkling:free';
const FREE = 'openrouter/openrouter/free';
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function isValidFree(model) {
  return model === FREE || /^openrouter\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._:-]+:free$/.test(model);
}
function readRegular(file, privateOnly = false) {
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const info = fs.fstatSync(fd);
    if (!info.isFile() || (privateOnly && (info.mode & 0o077) !== 0)) throw new Error('Unsafe configuration file');
    return fs.readFileSync(fd, 'utf8');
  } finally {
    fs.closeSync(fd);
  }
}
function paidAutoEnabled(env) {
  const flag = env.JARVIS_RECOVER_PAID_AUTO;
  return flag === undefined || flag === '1';
}
function primaryOf(model) {
  return typeof model === 'string' ? model : model?.primary;
}
function rewriteRef(value, model) {
  if (isPaidAuto(value)) return model;
  if (!record(value)) return value;
  const next = { ...value };
  let changed = false;
  if (isPaidAuto(next.primary)) {
    next.primary = model;
    changed = true;
  }
  if (Array.isArray(next.fallbacks)) {
    const fallbacks = [];
    for (const item of next.fallbacks) {
      const mapped = isPaidAuto(item) ? model : item;
      if (mapped !== item || fallbacks.includes(mapped)) changed = true;
      if (!fallbacks.includes(mapped)) fallbacks.push(mapped);
    }
    if (changed) next.fallbacks = fallbacks;
  }
  return changed ? next : value;
}
function assignSlot(target, key, model) {
  if (target[key] == null) return false;
  const next = rewriteRef(target[key], model);
  if (next === target[key]) return false;
  target[key] = next;
  return true;
}
function allowlistBlocks(defaults, model) {
  const allowed = defaults.models;
  if (allowed == null) return false;
  if (!record(allowed)) return true;
  const keys = Object.keys(allowed);
  return keys.length > 0 && !Object.hasOwn(allowed, model) && !Object.keys(allowed).some(isPaidAuto);
}
function promoteAllowlist(defaults, model) {
  const allowed = defaults.models;
  if (allowed == null) return { ok: true, changed: false };
  if (!record(allowed)) return { ok: false, changed: false };
  const keys = Object.keys(allowed);
  if (keys.length && !Object.hasOwn(allowed, model) && !Object.keys(allowed).some(isPaidAuto)) {
    return { ok: false, changed: false };
  }
  if (!Object.keys(allowed).some(isPaidAuto)) return { ok: true, changed: false };
  const next = { ...allowed, [model]: allowed[model] ?? {} };
  for (const key of Object.keys(next)) if (isPaidAuto(key)) delete next[key];
  defaults.models = next;
  return { ok: true, changed: true };
}
function refHasAuto(value) {
  if (isPaidAuto(value)) return true;
  if (!record(value)) return false;
  if (isPaidAuto(value.primary)) return true;
  return Array.isArray(value.fallbacks) && value.fallbacks.some(isPaidAuto);
}
function hasPaidAuto(cfg) {
  const defaults = cfg.agents.defaults;
  if (['model', 'utilityModel', 'imageModel'].some(key => refHasAuto(defaults[key]))) return true;
  if (record(defaults.models) && Object.keys(defaults.models).some(isPaidAuto)) return true;
  if (record(defaults.mediaModels) && Object.values(defaults.mediaModels).some(refHasAuto)) return true;
  if (Array.isArray(cfg.agents.list) && cfg.agents.list.some(agent => record(agent) && refHasAuto(agent.model))) return true;
  if (record(cfg.agents.entries) && Object.values(cfg.agents.entries).some(agent => record(agent) && refHasAuto(agent.model))) return true;
  return false;
}
function stripPaidAuto(cfg, model) {
  const defaults = cfg.agents.defaults;
  let changed = false;
  for (const key of ['model', 'utilityModel', 'imageModel']) {
    if (assignSlot(defaults, key, model)) changed = true;
  }
  if (record(defaults.mediaModels)) {
    const media = { ...defaults.mediaModels };
    let mediaChanged = false;
    for (const key of Object.keys(media)) {
      const next = rewriteRef(media[key], model);
      if (next !== media[key]) {
        media[key] = next;
        mediaChanged = true;
      }
    }
    if (mediaChanged) {
      defaults.mediaModels = media;
      changed = true;
    }
  }
  const allow = promoteAllowlist(defaults, model);
  if (!allow.ok) return { ok: false, changed: false };
  if (allow.changed) changed = true;
  if (Array.isArray(cfg.agents.list)) {
    cfg.agents.list = cfg.agents.list.map(agent => {
      if (!record(agent) || agent.model == null) return agent;
      const next = rewriteRef(agent.model, model);
      if (next === agent.model) return agent;
      changed = true;
      return { ...agent, model: next };
    });
  }
  if (record(cfg.agents.entries)) {
    const entries = { ...cfg.agents.entries };
    for (const key of Object.keys(entries)) {
      const agent = entries[key];
      if (!record(agent) || agent.model == null) continue;
      const next = rewriteRef(agent.model, model);
      if (next === agent.model) continue;
      entries[key] = { ...agent, model: next };
      changed = true;
    }
    cfg.agents.entries = entries;
  }
  return { ok: true, changed };
}
function stateDirFor(env, target) {
  if (env.OPENCLAW_STATE_DIR) return env.OPENCLAW_STATE_DIR;
  const dir = path.dirname(target);
  return path.basename(dir) === '.openclaw' ? dir : null;
}
function sessionStores(stateDir) {
  if (!stateDir) return [];
  const agentsDir = path.join(stateDir, 'agents');
  let agents;
  try {
    const info = fs.lstatSync(agentsDir);
    if (!info.isDirectory() || info.isSymbolicLink()) return [];
    agents = fs.readdirSync(agentsDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = [];
  for (const agent of agents) {
    if (!agent.isDirectory() || agent.isSymbolicLink()) continue;
    const file = path.join(agentsDir, agent.name, 'sessions', 'sessions.json');
    try {
      const info = fs.lstatSync(file);
      if (!info.isFile() || info.isSymbolicLink() || info.size > 5_000_000) continue;
      files.push(file);
    } catch { /* missing session store stays untouched */ }
  }
  return files;
}
function rewriteSessionStore(parsed, model) {
  if (!record(parsed)) return null;
  let changed = false;
  const next = {};
  for (const [key, entry] of Object.entries(parsed)) {
    if (!record(entry)) {
      next[key] = entry;
      continue;
    }
    const copy = { ...entry };
    for (const field of ['model', 'modelOverride']) {
      if (copy[field] === PAID_AUTO) {
        copy[field] = model;
        changed = true;
      }
    }
    if (record(copy.systemPromptReport) && copy.systemPromptReport.model === PAID_AUTO) {
      copy.systemPromptReport = { ...copy.systemPromptReport, model };
      changed = true;
    }
    next[key] = copy;
  }
  return changed ? next : null;
}
function savePrivateBackup(file, original) {
  const backup = file + '.pre-jarvis-recovery';
  try {
    fs.writeFileSync(backup, original, { flag: 'wx', mode: 0o600 });
  } catch (error) {
    if (error.code !== 'EEXIST') return false;
    try {
      if (readRegular(backup, true) !== original) return false;
    } catch {
      return false;
    }
  }
  return true;
}
function replaceJson(file, original, value) {
  if (readRegular(file) !== original) return false;
  const temporary = file + '.recovery-' + process.pid + '-' + Math.random().toString(16).slice(2) + '.tmp';
  let created = false;
  try {
    fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    created = true;
    if (readRegular(file) !== original) return false;
    fs.renameSync(temporary, file);
    created = false;
    return true;
  } finally {
    if (created) fs.rmSync(temporary, { force: true });
  }
}
function recoverSessions(env, target, model) {
  let changed = 0;
  let skipped = 0;
  for (const file of sessionStores(stateDirFor(env, target))) {
    try {
      const original = readRegular(file);
      const next = rewriteSessionStore(JSON.parse(original), model);
      if (!next) continue;
      if (!savePrivateBackup(file, original)) {
        skipped += 1;
        continue;
      }
      if (!replaceJson(file, original, next)) skipped += 1;
      else changed += 1;
    } catch {
      skipped += 1;
    }
  }
  return { changed, skipped };
}
function recoverModel(env = process.env) {
  const explicit = env.JARVIS_RECOVERY_MODEL;
  if (explicit != null && explicit !== '' && (/\s/.test(explicit) || !isValidFree(explicit))) return 'invalid_model';
  if (explicit === '') return 'disabled';
  const autoOn = paidAutoEnabled(env);
  const destination = isValidFree(explicit) ? explicit : null;
  if (!destination && !autoOn) return 'disabled';
  const target = env.OPENCLAW_CONFIG_PATH || path.join(env.OPENCLAW_STATE_DIR || '/data/.openclaw', 'openclaw.json');
  try {
    const original = readRegular(target);
    const cfg = JSON.parse(original);
    const pending = [cfg];
    while (pending.length) {
      const value = pending.pop();
      if (value && typeof value === 'object') {
        if (Object.hasOwn(value, '$include')) return 'included_config';
        pending.push(...Object.values(value));
      }
    }
    if (!record(cfg) || !record(cfg.agents) || !record(cfg.agents.defaults)) return 'unsupported_config';
    const primary = primaryOf(cfg.agents.defaults.model);
    const inkling = primary === INKLING;
    if (inkling && !destination) return 'disabled';
    const model = destination || FREE;
    if (inkling) {
      if (primary === model) return 'unchanged';
      const allowed = cfg.agents.defaults.models;
      if (allowed != null && (!record(allowed) || (Object.keys(allowed).length && !Object.hasOwn(allowed, model)))) return 'model_not_allowlisted';
    }
    const autoPresent = hasPaidAuto(cfg);
    if (!inkling && !autoPresent) {
      if (!autoOn) return 'preserved_model';
      const sessions = recoverSessions(env, target, model);
      if (sessions.changed) return 'sessions_recovered';
      return sessions.skipped ? 'sessions_skipped' : 'preserved_model';
    }
    if (!inkling && !autoOn) return 'preserved_model';
    if (cfg.models?.mode === 'replace') return 'custom_catalog';
    if (!inkling && allowlistBlocks(cfg.agents.defaults, model)) return 'model_not_allowlisted';
    let configChanged = false;
    if (inkling) {
      const current = cfg.agents.defaults.model;
      cfg.agents.defaults.model = typeof current === 'string' ? model : { ...current, primary: model };
      configChanged = true;
    }
    if (!inkling || autoOn) {
      const stripped = stripPaidAuto(cfg, model);
      if (!stripped.ok) return 'model_not_allowlisted';
      configChanged = configChanged || stripped.changed;
    }
    if (!configChanged) {
      const sessions = recoverSessions(env, target, model);
      if (sessions.changed) return 'sessions_recovered';
      return sessions.skipped ? 'sessions_skipped' : 'unchanged';
    }
    if (!savePrivateBackup(target, original)) return 'backup_unavailable';
    if (!replaceJson(target, original, cfg)) return 'config_changed';
    recoverSessions(env, target, model);
    return 'recovered';
  } catch {
    return 'skipped';
  }
}
module.exports = { recoverModel };
if (require.main === module) console.log('[JARVIS] Model recovery: ' + recoverModel() + '.');
