import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp, writeFile, readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { planGeminiAuth } = require("../infra/openclaw/configure-gemini-auth.cjs");
const helper = new URL("../infra/openclaw/configure-gemini-auth.cjs", import.meta.url);
const env = { GEMINI_API_KEY: "fixture-new-gemini-key" };

test("Gemini runtime uses a native env reference without copying keys or changing profiles, models, or other providers", () => {
  const original = { auth: { order: { google: ["google:old"] }, profiles: { "google:old": { provider: "google", mode: "api_key" } } },
    agents: { defaults: { model: { primary: "google/example" } } },
    models: { providers: { google: { models: [{ id: "example", name: "Example" }] }, openai: { apiKey: "fixture-other-key" } } },
    secrets: { providers: { existing: { source: "env" } } } };
  const snapshot = JSON.stringify(original);
  const plan = planGeminiAuth(original, env);
  assert.equal(plan.changed, true);
  assert.deepEqual(plan.config.models.providers.google.apiKey, { source: "env", provider: "jarvis-gemini", id: "GEMINI_API_KEY" });
  assert.equal(plan.config.models.providers.google.auth, "api-key");
  assert.deepEqual(plan.config.secrets.providers["jarvis-gemini"], { source: "env", allowlist: ["GEMINI_API_KEY"] });
  assert.deepEqual(plan.config.auth, original.auth);
  assert.deepEqual(plan.config.agents, original.agents);
  assert.deepEqual(plan.config.models.providers.google.models, original.models.providers.google.models);
  assert.deepEqual(plan.config.models.providers.openai, original.models.providers.openai);
  assert.equal(JSON.stringify(original), snapshot);
  assert.equal(JSON.stringify(plan.config).includes(env.GEMINI_API_KEY), false);
  assert.equal(planGeminiAuth(plan.config, { GEMINI_API_KEY: "fixture-rotated-key" }).changed, false);
});

test("Gemini binding respects missing keys, opt-out, explicit auth choices and custom routes", () => {
  assert.equal(planGeminiAuth({}, {}).reason, "key_missing");
  assert.equal(planGeminiAuth({}, { ...env, JARVIS_USE_RAILWAY_GEMINI: "0" }).reason, "disabled");
  for (const [google, reason] of [
    [{ auth: "oauth" }, "explicit_google_auth"],
    [{ authHeader: false }, "explicit_google_auth"],
    [{ request: { auth: { mode: "authorization-bearer", token: "existing-request-key" } } }, "explicit_google_auth"],
    [{ request: { auth: { mode: "header", headerName: "x-owner-key", value: "existing-request-key" } } }, "explicit_google_auth"],
    [{ request: { headers: { "x-goog-api-key": "existing-request-key" } } }, "explicit_google_header"],
    [{ request: { auth: null } }, "invalid_config"],
    [{ request: { headers: [] } }, "invalid_config"],
    [null, "invalid_config"],
    [false, "invalid_config"],
    [{ apiKey: "existing-owner-key" }, "explicit_google_key"],
    [{ baseUrl: "https://custom.example/v1" }, "custom_google_endpoint"],
    [{ baseUrl: "https://generativelanguage.googleapis.com.evil.example/v1" }, "custom_google_endpoint"],
    [{ baseUrl: "http://generativelanguage.googleapis.com/v1" }, "custom_google_endpoint"],
    [{ headers: { "X-Goog-Api-Key": "existing-header" } }, "explicit_google_header"],
    [{ models: [{ id: "custom", name: "Custom", baseUrl: "https://custom.example" }] }, "custom_google_endpoint"]
  ]) {
    const config = { models: { providers: { google } } };
    const plan = planGeminiAuth(config, env);
    assert.equal(plan.changed, false);
    assert.equal(plan.reason, reason);
    assert.deepEqual(plan.config, config);
  }
  assert.equal(planGeminiAuth({ models: { mode: "replace" } }, env).reason, "custom_catalog");
  assert.equal(planGeminiAuth({ models: { providers: { Google: { apiKey: "existing-owner-key" } } } }, env).reason, "noncanonical_google_provider");
  assert.equal(planGeminiAuth({ models: { $include: "models.json" } }, env).reason, "included_config");
  assert.equal(planGeminiAuth({ models: { providers: { google: { request: { auth: { mode: "provider-default" } } } } } }, env).changed, true);
  assert.equal(planGeminiAuth({ secrets: { providers: { "jarvis-gemini": { source: "file", path: "/owner-path" } } } }, env).reason, "secret_provider_conflict");
});

test("Gemini repair makes a private backup, is repeatable, and never modifies saved auth storage or exposes keys", async t => {
  const root = await mkdtemp(join(tmpdir(), "jarvis-gemini-auth-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const target = join(root, "openclaw.json");
  const authFile = join(root, "auth-profiles.json");
  const original = JSON.stringify({ agents: { defaults: { model: { primary: "google/example" } } } });
  await writeFile(target, original, { mode: 0o600 });
  await writeFile(authFile, '{"fixture":"old-saved-profile-unchanged"}', { mode: 0o600 });
  const runEnv = { ...process.env, ...env, JARVIS_USE_RAILWAY_GEMINI: "", OPENCLAW_CONFIG_PATH: target };
  const output = execFileSync(process.execPath, [helper.pathname], { env: runEnv, encoding: "utf8" });
  const configured = await readFile(target, "utf8");
  assert.equal(configured.includes(env.GEMINI_API_KEY), false);
  assert.equal(output.includes(env.GEMINI_API_KEY), false);
  assert.equal(await readFile(target + ".jarvis-before-gemini-env.bak", "utf8"), original);
  assert.equal((await stat(target + ".jarvis-before-gemini-env.bak")).mode & 0o777, 0o600);
  assert.equal((await stat(target)).mode & 0o777, 0o600);
  execFileSync(process.execPath, [helper.pathname], { env: { ...runEnv, GEMINI_API_KEY: "fixture-rotated-key" }, stdio: "pipe" });
  assert.equal(await readFile(target, "utf8"), configured);
  assert.equal(await readFile(authFile, "utf8"), '{"fixture":"old-saved-profile-unchanged"}');
  await writeFile(target, '{not strict json');
  execFileSync(process.execPath, [helper.pathname], { env: runEnv, stdio: "pipe" });
  assert.equal(await readFile(target, "utf8"), '{not strict json');
});
