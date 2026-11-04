// One-time, owner-enabled tuning for the known free-router/Inkling installation.
const path = require('node:path');
const { readRegular, savePrivateBackup, replaceJson, sessionStores, isValidFree } = require('./recover-model.cjs');
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
  if ([FREE, INKLING].includes(value)) return value;
  if (provider === 'openrouter') return 'openrouter/' + value;
  return null;
}

function planSessions(sessions) {
  if (!record(sessions)) return null;
  const next = structuredClone(sessions);
  for (const entry of Object.values(next)) {
    if (!record(entry) || entry.modelSelectionLocked || entry.acp || entry.modelFallback) continue;
    const hasOverride = entry.modelOverride != null || entry.providerOverride != null;
    const selected = hasOverride
      ? fullRoute(entry.modelOverride, entry.providerOverride)
      : fullRoute(entry.model, entry.modelProvider);
    if (![FREE, INKLING].includes(selected)) continue;
    // Inherit the configured free default: an explicit session model pin disables
    // configured fallback behavior in this OpenClaw version.
    for (const key of ['modelOverride', 'providerOverride', 'modelOverrideSource',
      'modelOverrideRouteResolution', 'modelOverrideFallbackOriginProvider',
      'modelOverrideFallbackOriginModel']) delete entry[key];
    if ([FREE, INKLING].includes(fullRoute(entry.model, entry.modelProvider))) {
      entry.model = 'openrouter/free';
      entry.modelProvider = 'openrouter';
    }
    entry.thinkingLevel = 'minimal';
  }
  return next;
}

function save(file, original, next) {
  if (JSON.stringify(JSON.parse(original)) === JSON.stringify(next)) return 'unchanged';
  if (!savePrivateBackup(file, original, BACKUP)) return 'backup_unavailable';
  return replaceJson(file, original, next) ? 'applied' : 'changed_during_read';
}

function configureFreeChat(env = process.env) {
  if (env.JARVIS_FREE_CHAT_PROFILE !== '1') return { reason: 'disabled' };
  const target = env.OPENCLAW_CONFIG_PATH || path.join(env.OPENCLAW_STATE_DIR || '/data/.openclaw', 'openclaw.json');
  try {
    const original = readRegular(target);
    const next = planConfig(JSON.parse(original));
    if (!next) return { reason: 'unsupported_config' };
    const config = save(target, original, next);
    if (!['applied', 'unchanged'].includes(config)) return { reason: config };
    let sessionsApplied = 0;
    let sessionsSkipped = 0;
    // An arbitrary custom config path does not imply ownership of nearby sessions.
    const stateDir = env.OPENCLAW_STATE_DIR ||
      (path.basename(path.dirname(target)) === '.openclaw' ? path.dirname(target) : null);
    for (const file of sessionStores(stateDir)) {
      try {
        const sessionOriginal = readRegular(file);
        const planned = planSessions(JSON.parse(sessionOriginal));
        if (!planned) { sessionsSkipped += 1; continue; }
        const result = save(file, sessionOriginal, planned);
        if (result === 'applied') sessionsApplied += 1;
        else if (result !== 'unchanged') sessionsSkipped += 1;
      } catch { sessionsSkipped += 1; }
    }
    return { reason: config, sessionsApplied, sessionsSkipped };
  } catch {
    return { reason: 'skipped' };
  }
}

module.exports = { configureFreeChat, planConfig, planSessions };
if (require.main === module) console.log('[JARVIS] Free chat profile: ' + JSON.stringify(configureFreeChat()) + '.');
