// Opt-in, reversible memory policy. Never disable model providers.
const fs = require("node:fs");
const path = require("node:path");
const applyMemoryPolicy = process.env.JARVIS_APPLY_LOW_MEMORY_POLICY === "1";
const restoreProviders = process.env.JARVIS_RESTORE_MODEL_PROVIDERS === "1";
if (!applyMemoryPolicy && !restoreProviders) {
  console.log("[JARVIS] Preserving current plugin settings.");
  process.exit(0);
}

const stateDir = process.env.OPENCLAW_STATE_DIR || "/data/.openclaw";
const target = process.env.OPENCLAW_CONFIG_PATH || path.join(stateDir, "openclaw.json");
const backup = target + ".jarvis-before-plugin-optimization.bak";
const disabled = ["canvas", "cua-computer", "geolocation", "talk-voice"];
const legacyProviders = new Set(["anthropic", "ollama", "xai"]);

function readConfig(file) {
  const original = fs.readFileSync(file, "utf8");
  const cfg = JSON.parse(original);
  if (!cfg || typeof cfg !== "object" || Array.isArray(cfg) ||
      (cfg.plugins != null && (typeof cfg.plugins !== "object" || Array.isArray(cfg.plugins))) ||
      (cfg.plugins?.deny != null && (!Array.isArray(cfg.plugins.deny) ||
        cfg.plugins.deny.some(value => typeof value !== "string")))) {
    throw new Error("Invalid config shape");
  }
  return { original, cfg };
}

function saveBackup(file, content) {
  try {
    fs.writeFileSync(file, content, { flag: "wx", mode: 0o600 });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
}

let temporary;
let createdTemporary = false;
try {
  if (!fs.existsSync(target)) {
    console.log("[JARVIS] Config not present; leaving plugin policy unchanged.");
    process.exit(0);
  }
  const { original, cfg } = readConfig(target);
  const existing = cfg.plugins?.deny || [];
  let next = [...existing];
  if (restoreProviders) {
    // Explicit owner opt-in is required. Restore only provider denials that
    // were absent from the optimizer's original backup; preserve user denials.
    const previous = readConfig(backup).cfg.plugins?.deny || [];
    next = next.filter(value => !legacyProviders.has(value) || previous.includes(value));
  }
  if (applyMemoryPolicy) next = [...new Set([...next, ...disabled])];
  if (JSON.stringify(next) === JSON.stringify(existing)) {
    console.log("[JARVIS] Requested plugin policy already present.");
    process.exit(0);
  }
  if (restoreProviders) saveBackup(target + ".jarvis-before-provider-restore.bak", original);
  if (applyMemoryPolicy) saveBackup(backup, original);
  cfg.plugins = { ...cfg.plugins, deny: next };
  temporary = target + ".jarvis-opt-" + process.pid + ".tmp";
  fs.writeFileSync(temporary, JSON.stringify(cfg, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  createdTemporary = true;
  fs.renameSync(temporary, target);
  createdTemporary = false;
  console.log("[JARVIS] Requested plugin policy applied; original configuration backed up.");
} catch (error) {
  console.warn("[JARVIS] Plugin policy skipped; saved settings preserved. Check config and original backup.");
} finally {
  if (createdTemporary) fs.rmSync(temporary, { force: true });
}
