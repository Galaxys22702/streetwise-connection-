import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCommandWorkspace, commandsAvailable } from "../src/services/jarvisCommands.js";
import { createCommandControls } from "../public/jarvis-commands.js";

async function fixture(t, options = {}) {
  const root = await mkdtemp(join(tmpdir(), "jarvis-commands-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const env = { ...process.env, NODE_ENV: "development", JARVIS_COMMANDS_ENABLED: "true", JARVIS_WORKSPACE: root,
    JARVIS_ACCESS_TOKEN: "test-access-secret-never-forward", JARVIS_AI_KEY: "test-ai-secret-never-forward",
    DATABASE_URL: "test-database-secret-never-forward" };
  return { root, env, runner: createCommandWorkspace({ env, ...options }) };
}

test("Commands require explicit development opt-in and the Node runtime", () => {
  const enabled = { NODE_ENV: "development", JARVIS_COMMANDS_ENABLED: "true" };
  assert.equal(commandsAvailable(enabled, "node"), true);
  for (const env of [{}, { ...enabled, NODE_ENV: "production" }, { ...enabled, NODE_ENV: "test" }, { ...enabled, NODE_ENV: undefined }, { ...enabled, JARVIS_COMMANDS_ENABLED: "false" }]) {
    assert.equal(commandsAvailable(env, "node"), false);
  }
  assert.equal(commandsAvailable(enabled, "vercel"), false);
});

test("Prepare does not execute; authenticated Run uses the exact ticket once", async t => {
  const { runner, root } = await fixture(t);
  const ticket = await runner.prepare({ command: "printf done > result.txt" }, "node");
  await assert.rejects(readFile(join(root, "result.txt")), { code: "ENOENT" });
  await assert.rejects(runner.run({ id: ticket.id, command: "different" }, "node"), { message: "jarvis_invalid_command_ticket" });
  const result = await runner.run({ id: ticket.id }, "node");
  assert.equal(await readFile(join(root, "result.txt"), "utf8"), "done");
  assert.equal(result.succeeded, true);
  assert.equal(result.exitCode, 0);
  assert.equal(result.audit[0].type, "policy_decision");
  assert.equal(result.audit[0].riskTier, 3);
  assert.equal(result.audit.at(-1).type, "tool_execution");
  assert.equal(JSON.stringify(result.audit).includes("printf"), false);
  await assert.rejects(runner.run({ id: ticket.id }, "node"), { message: "jarvis_command_expired" });
});

test("Command tickets expire and cannot be used on production/serverless runners", async t => {
  let clock = Date.now();
  const { runner, env } = await fixture(t, { now: () => clock });
  const ticket = await runner.prepare({ command: "printf ok" }, "node");
  await assert.rejects(runner.run({ id: ticket.id }, "vercel"), { message: "jarvis_commands_unavailable" });
  clock += 300001;
  await assert.rejects(runner.run({ id: ticket.id }, "node"), { message: "jarvis_command_expired" });
  env.NODE_ENV = "production";
  await assert.rejects(runner.prepare({ command: "printf ok" }, "node"), { message: "jarvis_commands_unavailable" });
});

test("Starting directories reject escapes and symlink changes after review", async t => {
  const { runner, root } = await fixture(t);
  await assert.rejects(runner.prepare({ command: "pwd", cwd: ".." }, "node"), { message: "jarvis_invalid_directory" });
  await mkdir(join(root, "child"));
  const ticket = await runner.prepare({ command: "pwd", cwd: "child" }, "node");
  await rm(join(root, "child"), { recursive: true });
  await symlink(tmpdir(), join(root, "child"));
  await assert.rejects(runner.run({ id: ticket.id }, "node"), { message: "jarvis_invalid_directory" });
});

test("Command child excludes Jarvis and database keys and redacts inherited credential output", async t => {
  const { root, env } = await fixture(t);
  env.GH_TOKEN = "test-github-secret-must-be-redacted";
  const runner = createCommandWorkspace({ env });
  const command = 'printf "chat=%s ai=%s db=%s gh=%s" "$JARVIS_ACCESS_TOKEN" "$JARVIS_AI_KEY" "$DATABASE_URL" "$GH_TOKEN"';
  const ticket = await runner.prepare({ command, cwd: root }, "node");
  const result = await runner.run({ id: ticket.id }, "node");
  assert.equal(result.output, "chat= ai= db= gh=[redacted]");
});

test("Proxy passwords and Git authorization token components are redacted", async t => {
  const { env } = await fixture(t);
  env.HTTPS_PROXY = "http://proxy-user:proxy-password-secret@proxy.invalid:8080";
  env.GIT_CONFIG_VALUE_0 = "Authorization: Bearer git-header-token-secret";
  const runner = createCommandWorkspace({ env });
  const ticket = await runner.prepare({ command: 'printf "proxy-password-secret git-header-token-secret"' }, "node");
  const result = await runner.run({ id: ticket.id }, "node");
  assert.equal(result.output, "[redacted] [redacted]");
});

test("Concurrent reviews cannot exceed the pending-ticket bound", async t => {
  const { runner } = await fixture(t);
  const results = await Promise.allSettled(Array.from({ length: 30 }, () => runner.prepare({ command: "printf safe" }, "node")));
  assert.equal(results.filter(value => value.status === "fulfilled").length, 20);
  assert.equal(results.filter(value => value.status === "rejected" && value.reason.message === "jarvis_too_many_pending_commands").length, 10);
});

test("Nonzero exits, timeout, output limits and concurrent execution are reported accurately", async t => {
  const { env } = await fixture(t);
  const runner = createCommandWorkspace({ env, timeoutMs: 100, maxBytes: 32 });
  let ticket = await runner.prepare({ command: "printf failure; exit 7" }, "node");
  let result = await runner.run({ id: ticket.id }, "node");
  assert.equal(result.exitCode, 7);
  assert.equal(result.succeeded, false);
  ticket = await runner.prepare({ command: "sleep 5" }, "node");
  const waiting = runner.run({ id: ticket.id }, "node");
  const other = await runner.prepare({ command: "printf another" }, "node");
  await assert.rejects(runner.run({ id: other.id }, "node"), { message: "jarvis_command_running" });
  result = await waiting;
  assert.equal(result.timedOut, true);
  assert.equal(result.succeeded, false);
  ticket = await runner.prepare({ command: "printf 1234567890123456789012345678901234567890" }, "node");
  result = await runner.run({ id: ticket.id }, "node");
  assert.equal(result.truncated, true);
  assert.equal(result.output.length, 32);
});

test("Disconnected command reviews cannot revive approval or errors in a new session", async () => {
  const savedDocument = globalThis.document;
  globalThis.document = { querySelectorAll: () => [] };
  try {
    for (const rejected of [false, true]) {
      const elements = new Map();
      const byId = id => {
        if (!elements.has(id)) elements.set(id, { value: "", textContent: "", hidden: false, disabled: false,
          listeners: {}, addEventListener(type, listener) { this.listeners[type] = listener; }, focus() {} });
        return elements.get(id);
      };
      let resolve, reject, calls = 0;
      const deferred = new Promise((yes, no) => { resolve = yes; reject = no; });
      const controls = createCommandControls({ byId, api: () => { calls++; return deferred; } });
      byId("command").value = "git status";
      byId("command-cwd").value = ".";
      const request = byId("command-form").listeners.submit({ preventDefault() {} });
      controls.reset();
      byId("workspace").hidden = false;
      byId("command").value = "git status";
      byId("command-cwd").value = ".";
      if (rejected) reject(new Error("Stale error"));
      else resolve({ id: "old-ticket", command: "git status", cwd: "/old" });
      await request;
      assert.equal(byId("command-review").hidden, true);
      assert.equal(byId("command-notice").textContent, "");
      await byId("run-command").listeners.click();
      assert.equal(calls, 1);
    }
  } finally {
    if (savedDocument === undefined) delete globalThis.document; else globalThis.document = savedDocument;
  }
});
