// Reversible OpenClaw low-memory plugin policy.
// Preserve user credentials, conversations, plugin settings, and any existing deny rules.
// Opt in explicitly; normal restarts must respect changes made in the UI.
if (process.env.JARVIS_APPLY_LOW_MEMORY_POLICY !== "1") {
  console.log("[JARVIS] Preserving current plugin settings.");
  process.exit(0);
}
const fs = require("node:fs");
const path = require("node:path");
const stateDir = process.env.OPENCLAW_STATE_DIR || "/data/.openclaw";
const target = process.env.OPENCLAW_CONFIG_PATH || path.join(stateDir, "openclaw.json");
const backup = target + ".jarvis-before-plugin-optimization.bak";
const disabled = ["anthropic", "canvas", "cua-computer", "geolocation", "ollama", "talk-voice", "xai"];
try {
  if (!fs.existsSync(target)) {
    console.log("[JARVIS] Config not present; leaving plugin policy unchanged.");
    process.exit(0);
  }
  const original = fs.readFileSync(target, "utf8");
  let cfg;
  try {
    cfg = JSON.parse(original);
  } catch {
    console.warn("[JARVIS] Config is not strict JSON; preserving it unchanged.");
    process.exit(0);
  }
  if (!cfg || typeof cfg !== "object" || Array.isArray(cfg)) {
    console.warn("[JARVIS] Unexpected config format; preserving it unchanged.");
    process.exit(0);
  }
  if (cfg.plugins != null && (typeof cfg.plugins !== "object" || Array.isArray(cfg.plugins))) {
    console.warn("[JARVIS] Unexpected plugins config; preserving it unchanged.");
    process.exit(0);
  }
  const plugins = cfg.plugins || {};
  if (plugins.deny != null && (!Array.isArray(plugins.deny) || plugins.deny.some(x => typeof x !== "string"))) {
    console.warn("[JARVIS] Unexpected plugins.deny; preserving it unchanged.");
    process.exit(0);
  }
  const existing = plugins.deny || [];
  const merged = [...new Set([...existing, ...disabled])];
  if (merged.length === existing.length) {
    console.log("[JARVIS] Low-memory plugin denylist already present.");
    process.exit(0);
  }
  fs.writeFileSync(backup, original, { flag: "wx", mode: 0o600 });
  cfg.plugins = { ...plugins, deny: merged };
  const temporary = target + ".jarvis-opt-" + process.pid + ".tmp";
  fs.writeFileSync(temporary, JSON.stringify(cfg, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  fs.renameSync(temporary, target);
  console.log("[JARVIS] Disabled 7 optional plugins; original configuration backed up.");
} catch (err) {
  if (err.code === "EEXIST" && fs.existsSync(backup)) {
    // Keep the first untouched backup and retry only the atomic config write.
    try {
      const original = fs.readFileSync(target, "utf8");
      const cfg = JSON.parse(original);
      const plugins = cfg.plugins || {};
      const existing = plugins.deny || [];
      if (!Array.isArray(existing)) throw new Error("Invalid existing plugin denylist");
      cfg.plugins = { ...plugins, deny: [...new Set([...existing, ...disabled])] };
      const temporary = target + ".jarvis-opt-" + process.pid + ".tmp";
      fs.writeFileSync(temporary, JSON.stringify(cfg, null, 2) + "\n", { flag: "wx", mode: 0o600 });
      fs.renameSync(temporary, target);
      console.log("[JARVIS] Low-memory plugin policy applied; original backup preserved.");
    } catch (secondErr) {
      console.warn("[JARVIS] Optimization skipped; saved data not intentionally modified: " + secondErr.code);
    }
  } else {
    console.warn("[JARVIS] Optimization skipped; saved data not intentionally modified: " + err.code);
  }
}
