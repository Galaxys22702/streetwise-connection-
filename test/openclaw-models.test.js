import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const methods = require("../infra/openclaw/setup-models.cjs");
const optimizer = new URL("../infra/openclaw/optimize-plugins.cjs", import.meta.url);
const groups = [
  { value: "google", options: [{ value: "gemini-api-key" }] },
  { value: "openai", options: [{ value: "openai-api-key" }, { value: "openai-device-code" }] },
  { value: "self-hosted", options: [{ value: "ollama" }, { value: "vllm" }] },
  { value: "copilot", options: [{ value: "github-copilot" }] },
  { value: "openrouter", options: [{ value: "openrouter-api-key" }] },
  { value: "custom", options: [{ value: "custom-api-key" }] }
];
function app(values = {}) {
  return { authGroups: [], selectedGroup: "", selectedAuth: "", authChoices: [], authSecret: "", model: "", ...methods, ...values };
}

test("OpenClaw setup refresh preserves provider, auth method and full gateway or alias model IDs", () => {
  for (const [group, auth, model] of [
    ["openai", "openai-device-code", "openai-codex/gpt-5"],
    ["self-hosted", "ollama", "ollama/local-model"],
    ["copilot", "github-copilot", "github-copilot/model"],
    ["openrouter", "openrouter-api-key", "openrouter/anthropic/claude-model"],
    ["custom", "custom-api-key", "my-endpoint/my-model"]
  ]) {
    const state = app({ selectedGroup: group, selectedAuth: auth, model, authSecret: "draft-only" });
    state.syncAuthGroups(groups);
    assert.equal(state.selectedGroup, group);
    assert.equal(state.selectedAuth, auth);
    assert.equal(state.model, model);
    assert.equal(state.authSecret, "draft-only");
  }
});

test("OpenClaw setup uses provider defaults without injecting a Google model", () => {
  const state = app();
  state.syncAuthGroups([...groups].reverse());
  assert.equal(state.selectedGroup, "custom");
  assert.equal(state.selectedAuth, "custom-api-key");
  assert.equal(state.model, "");
});

test("Changing provider or auth method clears the previous draft credential and model", () => {
  const state = app({ authGroups: groups, selectedGroup: "google", selectedAuth: "gemini-api-key",
    authSecret: "old-provider-draft", model: "google/model" });
  state.selectedGroup = "openai";
  state.changeAuthProvider();
  assert.equal(state.selectedAuth, "openai-api-key");
  assert.equal(state.authSecret, "");
  assert.equal(state.model, "");
  state.authSecret = "api-draft"; state.model = "openai/model";
  state.selectedAuth = "openai-device-code";
  state.changeAuthMethod();
  assert.equal(state.selectedAuth, "openai-device-code");
  assert.equal(state.authSecret, "");
  assert.equal(state.model, "");
});

test("Removed provider/auth choices do not retain a credential or stale model", () => {
  const state = app({ selectedGroup: "removed", selectedAuth: "old-auth", authSecret: "draft", model: "old/model" });
  state.syncAuthGroups(groups);
  assert.equal(state.authSecret, "");
  assert.equal(state.model, "");
  state.syncAuthGroups([]);
  assert.equal(state.selectedGroup, "");
  assert.equal(state.selectedAuth, "");
});

async function configFixture(t, cfg) {
  const root = await mkdtemp(join(tmpdir(), "jarvis-model-policy-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const target = join(root, "openclaw.json");
  await writeFile(target, JSON.stringify(cfg), { mode: 0o600 });
  function run(flags = {}) {
    const env = { ...process.env, OPENCLAW_CONFIG_PATH: target,
      JARVIS_APPLY_LOW_MEMORY_POLICY: "", JARVIS_RESTORE_MODEL_PROVIDERS: "", ...flags };
    execFileSync(process.execPath, [optimizer.pathname], { env, stdio: "pipe" });
  }
  return { target, run, read: async () => JSON.parse(await readFile(target, "utf8")) };
}

test("Memory policy no longer disables any model provider and preserves saved settings", async t => {
  const cfg = { agents: { defaults: { model: "openrouter/custom/model" } },
    auth: { profiles: { existing: { key: "fixture-only" } } }, plugins: { deny: ["user-denial"], entries: { custom: { enabled: true } } } };
  const fixture = await configFixture(t, cfg);
  fixture.run({ JARVIS_APPLY_LOW_MEMORY_POLICY: "1" });
  const next = await fixture.read();
  for (const provider of ["anthropic", "ollama", "xai"]) assert.equal(next.plugins.deny.includes(provider), false);
  assert.equal(next.plugins.deny.includes("user-denial"), true);
  assert.deepEqual(next.agents, cfg.agents);
  assert.deepEqual(next.auth, cfg.auth);
  assert.deepEqual(next.plugins.entries, cfg.plugins.entries);
  assert.deepEqual(JSON.parse(await readFile(fixture.target + ".jarvis-before-plugin-optimization.bak", "utf8")), cfg);
});

test("Legacy provider restoration is explicit and preserves original user provider denials", async t => {
  const cfg = { auth: { fixture: "unchanged" }, plugins: { deny: ["anthropic", "ollama", "xai", "custom-denial", "canvas"] } };
  const fixture = await configFixture(t, cfg);
  await writeFile(fixture.target + ".jarvis-before-plugin-optimization.bak", JSON.stringify({ plugins: { deny: ["anthropic", "custom-denial"] } }));
  fixture.run();
  assert.deepEqual(await fixture.read(), cfg);
  fixture.run({ JARVIS_RESTORE_MODEL_PROVIDERS: "1" });
  const restored = await fixture.read();
  assert.deepEqual(restored.plugins.deny, ["anthropic", "custom-denial", "canvas"]);
  assert.deepEqual(restored.auth, cfg.auth);
  assert.deepEqual(JSON.parse(await readFile(fixture.target + ".jarvis-before-provider-restore.bak", "utf8")), cfg);
  fixture.run({ JARVIS_RESTORE_MODEL_PROVIDERS: "1" });
  assert.deepEqual(await fixture.read(), restored);
});

test("Missing or invalid original backups never remove existing provider settings", async t => {
  const cfg = { plugins: { deny: ["ollama", "xai"] } };
  const fixture = await configFixture(t, cfg);
  fixture.run({ JARVIS_RESTORE_MODEL_PROVIDERS: "1" });
  assert.deepEqual(await fixture.read(), cfg);
  await writeFile(fixture.target + ".jarvis-before-plugin-optimization.bak", "{invalid");
  fixture.run({ JARVIS_RESTORE_MODEL_PROVIDERS: "1" });
  assert.deepEqual(await fixture.read(), cfg);
});
