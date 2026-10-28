// Explicit recovery only; never select a paid model or overwrite credentials.
const fs = require('node:fs');
const path = require('node:path');
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function recoverModel(env = process.env) {
  const model = env.JARVIS_RECOVERY_MODEL;
  if (!model) return 'disabled';
  if (/\s/.test(model)) return 'invalid_model';
  if (model !== 'openrouter/openrouter/free' && !/^openrouter\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._:-]+:free$/.test(model)) return 'invalid_model';
  const target = env.OPENCLAW_CONFIG_PATH || path.join(env.OPENCLAW_STATE_DIR || '/data/.openclaw', 'openclaw.json');
  let temporary, createdTemporary = false;
  try {
    if (!fs.lstatSync(target).isFile()) return 'non_file_config';
    const original = fs.readFileSync(target, 'utf8');
    const cfg = JSON.parse(original);
    // Includes need OpenClaw's resolver; do not rewrite them as plain JSON.
    const pending = [cfg];
    while (pending.length) {
      const value = pending.pop();
      if (value && typeof value === 'object') {
        if (Object.hasOwn(value, '$include')) return 'included_config';
        pending.push(...Object.values(value));
      }
    }
    if (!record(cfg) || !record(cfg.agents) || !record(cfg.agents.defaults)) return 'unsupported_config';
    const current = cfg.agents.defaults.model;
    const primary = typeof current === 'string' ? current : current?.primary;
    if (primary !== 'openrouter/thinkingmachines/inkling:free') return 'preserved_model';
    if (primary === model) return 'unchanged';
    // A restrictive catalog needs an operator to add and verify the model first.
    const allowed = cfg.agents.defaults.models;
    if (allowed != null && (!record(allowed) || (Object.keys(allowed).length && !Object.hasOwn(allowed, model)))) return 'model_not_allowlisted';
    if (cfg.models?.mode === 'replace') return 'custom_catalog';
    const backup = target + '.pre-jarvis-recovery';
    try {
      fs.writeFileSync(backup, original, { flag: 'wx', mode: 0o600 });
    } catch (error) {
      // Reuse only an exact, private, regular-file backup of this configuration.
      if (error.code !== 'EEXIST' || !fs.lstatSync(backup).isFile() ||
          (fs.statSync(backup).mode & 0o077) !== 0 || fs.readFileSync(backup, 'utf8') !== original) return 'backup_unavailable';
    }
    if (fs.readFileSync(target, 'utf8') !== original) return 'config_changed';
    cfg.agents.defaults.model = typeof current === 'string' ? model : { ...current, primary: model };
    temporary = target + '.recovery-' + process.pid + '.tmp';
    fs.writeFileSync(temporary, JSON.stringify(cfg, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    createdTemporary = true;
    if (fs.readFileSync(target, 'utf8') !== original) return 'config_changed';
    fs.renameSync(temporary, target);
    createdTemporary = false;
    temporary = undefined;
    return 'recovered';
  } catch {
    return 'skipped';
  } finally {
    if (createdTemporary) fs.rmSync(temporary, { force: true });
  }
}
module.exports = { recoverModel };
if (require.main === module) console.log('[JARVIS] Model recovery: ' + recoverModel() + '.');
