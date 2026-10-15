import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createJarvis, createToolRegistry, createPolicy, createAuditLog, createMemory,
  createApprovalStore, riskTiers
} from "../../jarvis/src/index.js";

const DEFAULT_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const fail = (message, statusCode) => Object.assign(new Error(message), { statusCode });

export function commandsAvailable(env = process.env, runtime = "vercel") {
  return runtime === "node" && env.NODE_ENV === "development" && env.JARVIS_COMMANDS_ENABLED === "true";
}

export function createCommandWorkspace({ env = process.env, now = Date.now, timeoutMs = 20000, maxBytes = 32768 } = {}) {
  const pending = new Map();
  let running = false;

  function check(runtime) {
    if (!commandsAvailable(env, runtime)) throw fail("jarvis_commands_unavailable", 503);
  }

  async function prepare(body, runtime) {
    check(runtime);
    const command = body?.command;
    if (typeof command !== "string" || !command.trim() || command.length > 4000 || command.includes("\0")) {
      throw fail("jarvis_invalid_command", 400);
    }
    const root = await realpath(env.JARVIS_WORKSPACE || DEFAULT_ROOT);
    const requested = body.cwd === undefined || body.cwd === "" ? "." : body.cwd;
    if (typeof requested !== "string" || requested.length > 1000) throw fail("jarvis_invalid_directory", 400);
    let cwd;
    try { cwd = await realpath(resolve(root, requested)); }
    catch { throw fail("jarvis_invalid_directory", 400); }
    const rel = relative(root, cwd);
    if (rel === ".." || rel.startsWith("../") || rel.startsWith("..\\") || isAbsolute(rel)) {
      throw fail("jarvis_invalid_directory", 400);
    }
    if (!(await stat(cwd)).isDirectory()) throw fail("jarvis_invalid_directory", 400);
    for (const [id, value] of pending) if (value.expiresAt <= now()) pending.delete(id);
    if (pending.size >= 20) throw fail("jarvis_too_many_pending_commands", 429);
    const ticket = { id: randomUUID(), command: command.trim(), root, cwd, expiresAt: now() + 300000 };
    pending.set(ticket.id, ticket);
    return { ok: true, id: ticket.id, command: ticket.command, cwd: ticket.cwd,
      expiresAt: new Date(ticket.expiresAt).toISOString() };
  }

  async function run(body, runtime) {
    check(runtime);
    // Authenticated Run is the dedicated approval action, not a client 'approved' flag.
    if (!body || typeof body.id !== "string" || Object.keys(body).some(key => key !== "id")) {
      throw fail("jarvis_invalid_command_ticket", 400);
    }
    const ticket = pending.get(body?.id);
    if (!ticket || ticket.expiresAt <= now()) {
      pending.delete(body?.id);
      throw fail("jarvis_command_expired", 409);
    }
    if (running) throw fail("jarvis_command_running", 409);
    pending.delete(ticket.id);
    running = true;
    try {
      try {
        if (await realpath(ticket.cwd) !== ticket.cwd || await realpath(env.JARVIS_WORKSPACE || DEFAULT_ROOT) !== ticket.root ||
            !(await stat(ticket.cwd)).isDirectory()) throw new Error();
      } catch { throw fail("jarvis_invalid_directory", 400); }
      const approvals = createApprovalStore();
      approvals.issue({ approvalId: ticket.id, approvedBy: "jarvis-owner", actorId: "jarvis-owner",
        capability: "workspace.command", environment: "development",
        expiresAt: new Date(Date.now() + 60000).toISOString() });
      const registry = createToolRegistry();
      registry.register({
        id: "workspace.command", riskTier: riskTiers.HIGH_IMPACT, productionEnabled: false,
        execute: () => executeCommand(ticket, { env, timeoutMs, maxBytes })
      });
      const audit = createAuditLog();
      const jarvis = createJarvis({ registry, audit, memory: createMemory(), policy: createPolicy({
        permissions: { "jarvis-owner": ["workspace.command"] },
        approvalVerifier: ({ request, environment }) => approvals.verifyAndConsume(request.metadata.approvalId,
          { actorId: request.actorId, capability: request.capability, environment })
      }) });
      const result = await jarvis.run({ actorId: "jarvis-owner", capability: "workspace.command", input: {},
        metadata: { environment: "development", approvalId: ticket.id } });
      if (!result.ok) throw fail("jarvis_command_failed", 500);
      return { ok: true, id: ticket.id, command: ticket.command, cwd: ticket.cwd,
        ...result.result, audit: audit.list() };
    } finally { running = false; }
  }

  return { prepare, run };
}

function executeCommand(ticket, { env, timeoutMs, maxBytes }) {
  return new Promise((resolveResult, reject) => {
    // Keep runtime Git/proxy configuration, but don't pass the chat API's own keys to commands.
    const allowed = new Set(["PATH", "HOME", "USERPROFILE", "SYSTEMROOT", "SystemRoot", "COMSPEC", "PATHEXT",
      "TEMP", "TMP", "LANG", "LC_ALL", "TERM", "HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY",
      "http_proxy", "https_proxy", "no_proxy", "NODE_EXTRA_CA_CERTS", "SSL_CERT_FILE", "SSL_CERT_DIR",
      "REQUESTS_CA_BUNDLE", "CURL_CA_BUNDLE", "GIT_ASKPASS", "GIT_TERMINAL_PROMPT", "GH_TOKEN", "GITHUB_TOKEN",
      "GH_HOST", "GH_CONFIG_DIR", "GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM", "XDG_CONFIG_HOME", "GIT_CONFIG_COUNT"]);
    const childEnv = Object.fromEntries(Object.entries(env).filter(([key]) => allowed.has(key) || /^GIT_CONFIG_(KEY|VALUE)_\d+$/.test(key)));
    const secrets = new Set(Object.entries(env).filter(([key, value]) =>
      /key|token|secret|password|credential|authorization|^GIT_CONFIG_VALUE_\d+$/i.test(key) && typeof value === "string" && value.length >= 8)
      .map(([, value]) => value));
    for (const [key, value] of Object.entries(env)) {
      if (/^(https?_proxy)$/i.test(key) && typeof value === "string") {
        try {
          const url = new URL(value);
          if (url.password) secrets.add(decodeURIComponent(url.password));
          if (url.username) secrets.add(decodeURIComponent(url.username));
          if (url.password || url.username) secrets.add(value);
        } catch { /* Not a URL with credentials. */ }
      }
      if (/^GIT_CONFIG_VALUE_\d+$/.test(key) && typeof value === "string") {
        const token = value.match(/(?:proxy-)?authorization:\s*(?:bearer|basic)\s+(\S+)/i)?.[1];
        if (token) secrets.add(token);
      }
    }
    const secretValues = [...secrets].filter(Boolean).sort((a, b) => b.length - a.length);
    const redact = text => secretValues.reduce((value, secret) => value.split(secret).join("[redacted]"), text);
    const windows = process.platform === "win32";
    const child = spawn(windows ? "powershell.exe" : "/bin/sh",
      windows ? ["-NoProfile", "-NonInteractive", "-Command", ticket.command] : ["-c", ticket.command],
      { cwd: ticket.cwd, env: childEnv, detached: !windows, stdio: ["ignore", "pipe", "pipe"] });
    const started = Date.now();
    const chunks = [];
    let bytes = 0, timedOut = false, truncated = false, settled = false, forceTimer;
    function finish(error, code, signal) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(forceTimer);
      if (error) return reject(fail("jarvis_command_failed", 500));
      resolveResult({ output: redact(Buffer.concat(chunks).toString("utf8")), exitCode: code,
        signal, timedOut, truncated, durationMs: Date.now() - started,
        succeeded: code === 0 && !timedOut && !truncated });
    }
    function stop() {
      try {
        if (!windows) process.kill(-child.pid, "SIGKILL");
        else {
          const killer = spawn("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
          killer.on("error", () => child.kill("SIGKILL"));
        }
      } catch { /* Process may have exited already. */ }
      forceTimer ||= setTimeout(() => finish(null, null, "SIGKILL"), 2000);
    }
    function capture(chunk) {
      const buffer = Buffer.from(chunk);
      const remaining = Math.max(0, maxBytes - bytes);
      if (remaining) chunks.push(buffer.subarray(0, remaining));
      bytes += buffer.length;
      if (bytes > maxBytes) { truncated = true; stop(); }
    }
    const timer = setTimeout(() => { timedOut = true; stop(); }, timeoutMs);
    child.stdout.on("data", capture);
    child.stderr.on("data", capture);
    child.on("error", error => finish(error));
    child.on("close", (code, signal) => {
      // Also stop descendants that detached their stdio but remain in this process group.
      if (!windows) { try { process.kill(-child.pid, "SIGKILL"); } catch { /* Already exited. */ } }
      finish(null, code, signal);
    });
  });
}
