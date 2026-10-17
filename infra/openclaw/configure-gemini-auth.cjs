// Bind Railway's Gemini variable through OpenClaw's supported runtime config.
// Never copy the key into config, logs, command arguments, or saved profiles.
const fs = require("node:fs");
const path = require("node:path");
const alias = "jarvis-gemini";
const reference = { source: "env", provider: alias, id: "GEMINI_API_KEY" };
const envProvider = { source: "env", allowlist: ["GEMINI_API_KEY"] };
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function officialEndpoint(value) {
  if (value == null || value === "") return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "generativelanguage.googleapis.com" &&
      !url.port && !url.username && !url.password && !url.search && !url.hash;
  } catch {
    return false;
  }
}

function containsInclude(config) {
  const pending = [config], seen = new Set();
  while (pending.length) {
    const value = pending.pop();
    if (!value || typeof value !== "object" || seen.has(value)) continue;
    seen.add(value);
    if (Object.hasOwn(value, "$include")) return true;
    pending.push(...Object.values(value));
  }
  return false;
}

function planGeminiAuth(config, env = process.env) {
  const skip = reason => ({ changed: false, reason, config });
  if (env.JARVIS_USE_RAILWAY_GEMINI === "0") return skip("disabled");
  if (!env.GEMINI_API_KEY?.trim()) return skip("key_missing");
  if (!record(config)) return skip("invalid_config");
  for (const value of [config.models, config.models?.providers, config.secrets, config.secrets?.providers]) {
    if (value !== undefined && !record(value)) return skip("invalid_config");
  }
  if (containsInclude(config)) return skip("included_config");
  if (Object.keys(config.models?.providers || {}).some(name => name !== "google" && name.trim().toLowerCase() === "google")) {
    return skip("noncanonical_google_provider");
  }
  const google = config.models?.providers?.google === undefined ? {} : config.models.providers.google;
  if (!record(google)) return skip("invalid_config");
  if (config.models?.mode === "replace" && !Array.isArray(google.models)) return skip("custom_catalog");
  if (google.auth !== undefined && google.auth !== "api-key") return skip("explicit_google_auth");
  if (google.apiKey !== undefined && !same(google.apiKey, reference)) return skip("explicit_google_key");
  if (!officialEndpoint(google.baseUrl)) return skip("custom_google_endpoint");
  if (google.models !== undefined && !Array.isArray(google.models)) return skip("invalid_config");
  for (const model of google.models || []) {
    if (!record(model)) return skip("invalid_config");
    if (!officialEndpoint(model.baseUrl)) return skip("custom_google_endpoint");
  }
  if (google.authHeader !== undefined && google.authHeader !== true) return skip("explicit_google_auth");
  if (google.request !== undefined && !record(google.request)) return skip("invalid_config");
  const requestAuth = google.request?.auth;
  if (requestAuth !== undefined) {
    if (!record(requestAuth) || typeof requestAuth.mode !== "string") return skip("invalid_config");
    if (requestAuth.mode !== "provider-default") return skip("explicit_google_auth");
    if (Object.keys(requestAuth).some(name => name !== "mode")) return skip("invalid_config");
  }
  for (const headers of [google.headers, google.request?.headers, ...(google.models || []).map(model => model.headers)]) {
    if (headers !== undefined && !record(headers)) return skip("invalid_config");
    if (Object.keys(headers || {}).some(name => ["authorization", "x-goog-api-key"].includes(name.trim().toLowerCase()))) {
      return skip("explicit_google_header");
    }
  }
  const existingProvider = config.secrets?.providers?.[alias];
  if (existingProvider !== undefined && !same(existingProvider, envProvider)) return skip("secret_provider_conflict");
  const next = {
    ...config,
    secrets: { ...config.secrets, providers: { ...config.secrets?.providers, [alias]: envProvider } },
    models: { ...config.models, providers: { ...config.models?.providers,
      google: { ...google, auth: "api-key", apiKey: reference } } }
  };
  return { changed: !same(config, next), reason: "railway_gemini", config: next };
}

function configureGeminiAuth(env = process.env) {
  const target = env.OPENCLAW_CONFIG_PATH || path.join(env.OPENCLAW_STATE_DIR || "/data/.openclaw", "openclaw.json");
  let temporary, createdTemporary = false;
  try {
    if (!fs.existsSync(target)) {
      console.log("[JARVIS] Gemini binding deferred until OpenClaw configuration exists.");
      return;
    }
    if (!fs.lstatSync(target).isFile()) {
      console.log("[JARVIS] Gemini binding skipped; preserving non-file configuration.");
      return;
    }
    const original = fs.readFileSync(target, "utf8");
    const plan = planGeminiAuth(JSON.parse(original), env);
    if (!plan.changed) {
      console.log("[JARVIS] Gemini binding unchanged: " + plan.reason + ".");
      return;
    }
    try {
      fs.writeFileSync(target + ".jarvis-before-gemini-env.bak", original, { flag: "wx", mode: 0o600 });
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
    if (fs.readFileSync(target, "utf8") !== original) throw new Error("Configuration changed during planning");
    temporary = target + ".jarvis-google-" + process.pid + ".tmp";
    fs.writeFileSync(temporary, JSON.stringify(plan.config, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    createdTemporary = true;
    fs.renameSync(temporary, target);
    createdTemporary = false;
    console.log("[JARVIS] Google now references Railway GEMINI_API_KEY through native runtime authentication; saved profiles preserved.");
  } catch {
    console.warn("[JARVIS] Gemini binding skipped; configuration or backup needs review. Existing settings preserved.");
  } finally {
    if (createdTemporary) fs.rmSync(temporary, { force: true });
  }
}

module.exports = { planGeminiAuth, configureGeminiAuth };
if (require.main === module) configureGeminiAuth();
