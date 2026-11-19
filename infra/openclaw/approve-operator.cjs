// Approve pending Control UI operator devices from inside the gateway host.
// A Windows laptop is approved only when JARVIS_APPROVE_WINDOWS_NODE=1 and the
// pending device's display name and platform match. Command approval stays
// separate: camera, screen, and talk are never granted here.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const STATUS_MESSAGE = 'JARVIS, report your operational status and respond with JARVIS ONLINE.';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEVICE_ID = /^[A-Za-z0-9_.:-]{8,128}$/;
const NODE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{11,63}$/;
const ALLOWED_NODE_COMMANDS = new Set([
  'system.run',
  'system.run.prepare',
  'system.which',
  'system.notify',
  'device.info',
  'device.status'
]);
const ASK_EACH_COMMAND = JSON.stringify({
  version: 1,
  defaults: {
    security: 'allowlist',
    ask: 'always',
    askFallback: 'deny'
  }
});

function enabled(value) {
  return value === '1';
}

function extractJson(text) {
  const raw = String(text || '');
  for (let index = raw.lastIndexOf('{'); index >= 0; index = raw.lastIndexOf('{', index - 1)) {
    try {
      return JSON.parse(raw.slice(index));
    } catch {
      // Keep scanning. OpenClaw may print a log line before the JSON envelope.
    }
  }
  return null;
}

function rolesOf(request) {
  const roles = [];
  if (typeof request.role === 'string' && request.role) roles.push(request.role);
  if (Array.isArray(request.roles)) {
    for (const role of request.roles) {
      if (typeof role === 'string' && role && !roles.includes(role)) roles.push(role);
    }
  }
  return roles;
}

function isOperatorOnly(request) {
  const roles = rolesOf(request);
  return roles.length === 1 && roles[0] === 'operator';
}

function pendingOf(list) {
  if (Array.isArray(list)) return list;
  if (Array.isArray(list?.pending)) return list.pending;
  if (!list || typeof list !== 'object') return [];
  for (const value of Object.values(list)) {
    if (value && typeof value === 'object' && Array.isArray(value.pending)) return value.pending;
  }
  return [];
}

function selectOperatorRequests(list) {
  const chosen = [];
  for (const request of pendingOf(list)) {
    if (!request || !isOperatorOnly(request)) continue;
    if (typeof request.requestId !== 'string' || !UUID.test(request.requestId)) continue;
    chosen.push(request.requestId);
    if (chosen.length === 3) break;
  }
  return chosen;
}

function displayNameOf(request) {
  const candidates = [
    request.displayName,
    request.name,
    request.nodeName,
    request.device?.displayName,
    request.client?.displayName
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function platformOf(request) {
  const candidates = [request.platform, request.os, request.deviceFamily, request.clientId];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim().toLowerCase();
  }
  return '';
}

function isWindowsPlatform(platform) {
  return platform === 'win32'
    || platform === 'windows'
    || platform.startsWith('windows')
    || platform.includes('win32')
    || platform.includes('windows');
}

function nodeName(env) {
  const name = String(env.JARVIS_NODE_DISPLAY_NAME || '').trim();
  return NODE_NAME.test(name) ? name : '';
}

function selectWindowsNodeRequests(list, options) {
  const expected = String(options?.name || '').trim();
  const pinned = String(options?.pinnedDeviceId || '').trim();
  if (!NODE_NAME.test(expected)) return [];
  const chosen = [];
  for (const request of pendingOf(list)) {
    if (!request || rolesOf(request).join(',') !== 'node') continue;
    if (typeof request.requestId !== 'string' || !UUID.test(request.requestId)) continue;
    if (displayNameOf(request) !== expected) continue;
    if (!isWindowsPlatform(platformOf(request))) continue;
    const deviceId = typeof request.deviceId === 'string' ? request.deviceId.trim() : '';
    if (!DEVICE_ID.test(deviceId)) continue;
    if (pinned && deviceId !== pinned) continue;
    chosen.push({ requestId: request.requestId, deviceId });
    if (chosen.length === 1) break;
  }
  return chosen;
}

function commandNames(request) {
  const raw = request?.commands || request?.capabilities || request?.commandIds;
  if (!Array.isArray(raw)) return null;
  return raw.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean);
}

function selectWindowsCommandRequests(list, options) {
  const expected = String(options?.name || '').trim();
  if (!NODE_NAME.test(expected)) return [];
  const chosen = [];
  for (const request of pendingOf(list)) {
    if (!request) continue;
    if (typeof request.requestId !== 'string' || !UUID.test(request.requestId)) continue;
    if (displayNameOf(request) !== expected) continue;
    const commands = commandNames(request);
    if (!commands) {
      chosen.push({ requestId: request.requestId, allowed: false, unlisted: true, commands: [] });
      break;
    }
    if (!commands.every(command => ALLOWED_NODE_COMMANDS.has(command))) {
      chosen.push({
        requestId: request.requestId,
        allowed: false,
        commands
      });
      break;
    }
    chosen.push({ requestId: request.requestId, allowed: true, commands });
    break;
  }
  return chosen;
}

function summarizeReply(text) {
  const redacted = String(text || '').replace(/sk-[A-Za-z0-9_-]{8,}/g, '[redacted]');
  const models = [...new Set([...redacted.matchAll(/openrouter\/(?:[A-Za-z0-9._:-]+\/)*[A-Za-z0-9._:-]+/g)].map(match => match[0]))];
  return {
    online: redacted.includes('JARVIS ONLINE'),
    paidAuto: models.some(model => model === 'openrouter/openrouter/auto' || model === 'openrouter/auto'),
    free: models.includes('openrouter/openrouter/free') || models.some(model => model.endsWith(':free')),
    models: models.slice(0, 5)
  };
}

function probeArgs() {
  return [
    'agent', '--agent', 'main', '--session-key', 'jarvis-status-probe',
    '--message', STATUS_MESSAGE,
    '--model', 'openrouter/openrouter/free',
    '--thinking', 'minimal', '--timeout', '90', '--json'
  ];
}

function runCli(args, timeoutMs = 20000, input) {
  return new Promise(resolve => {
    const child = spawn('openclaw', args, { env: process.env });
    let out = '';
    let settled = false;
    let killTimer;
    const finish = code => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(killTimer);
      resolve({ code: code ?? 1, out });
    };
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      killTimer = setTimeout(() => {
        child.kill('SIGKILL');
        finish(1);
      }, 5000);
    }, timeoutMs);
    child.stdout.on('data', chunk => {
      out += chunk;
      if (out.length > 300000) out = out.slice(-300000);
    });
    child.stderr.on('data', chunk => {
      out += chunk;
      if (out.length > 300000) out = out.slice(-300000);
    });
    child.on('error', error => {
      out += error.message;
      finish(1);
    });
    child.on('close', code => finish(code));
    if (input) child.stdin.end(input);
    else child.stdin.end();
  });
}

async function gatewayReady(fetchImpl = globalThis.fetch) {
  const port = process.env.PORT || '8080';
  try {
    const response = await fetchImpl(`http://127.0.0.1:${port}/setup/healthz`);
    if (!response.ok) return false;
    const body = await response.json();
    return body?.gatewayReachable === true;
  } catch {
    return false;
  }
}

async function approvePending(run) {
  const listed = await run(['devices', 'list', '--json']);
  const parsed = extractJson(listed.out);
  if (!parsed) return [];
  const approved = [];
  for (const requestId of selectOperatorRequests(parsed)) {
    const result = await run(['devices', 'approve', requestId, '--json']);
    if (result.code === 0 && !/pairing required/i.test(result.out)) approved.push(requestId);
  }
  return approved;
}

function fileState(file) {
  if (!file) return null;
  return {
    read() {
      if (!fs.existsSync(file)) return '';
      return fs.readFileSync(file, 'utf8').trim();
    },
    write(deviceId) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, deviceId + '\n', { mode: 0o600 });
    }
  };
}

async function approveWindowsNode(run, env, deps = {}) {
  const name = nodeName(env);
  if (!name) return { reason: 'name_unset' };
  const state = deps.state || fileState(env.JARVIS_NODE_STATE_FILE);
  let pinned = '';
  if (state) {
    try {
      pinned = String(state.read() || '').trim();
    } catch {
      return { reason: 'state_unreadable' };
    }
    if (pinned && !DEVICE_ID.test(pinned)) return { reason: 'state_invalid' };
  }
  const listed = await run(['devices', 'list', '--json']);
  const parsed = extractJson(listed.out);
  if (!parsed) return { reason: 'devices_unreadable', approved: [] };
  const match = selectWindowsNodeRequests(parsed, { name, pinnedDeviceId: pinned })[0];
  if (!match) return { reason: pinned ? 'no_matching_device' : 'no_pending_windows_node', approved: [] };
  const approvedDevice = await run(['devices', 'approve', match.requestId, '--json']);
  if (approvedDevice.code !== 0 || /pairing required/i.test(approvedDevice.out)) {
    return { reason: 'device_approve_failed', approved: [] };
  }
  if (state && !pinned) {
    try {
      state.write(match.deviceId);
    } catch {
      return { reason: 'state_unwritable', approved: [match.requestId], deviceId: match.deviceId };
    }
  }
  const pendingNodes = await run(['nodes', 'pending', '--json']);
  const nodeList = extractJson(pendingNodes.out);
  const commandRequest = selectWindowsCommandRequests(nodeList, { name })[0];
  if (!commandRequest) {
    return { reason: 'paired_commands_pending', approved: [match.requestId], deviceId: match.deviceId };
  }
  if (!commandRequest.allowed) {
    return {
      reason: commandRequest.unlisted ? 'command_surface_unlisted' : 'commands_too_wide',
      approved: [match.requestId],
      deviceId: match.deviceId,
      commands: commandRequest.commands
    };
  }
  const approvedNode = await run(['nodes', 'approve', commandRequest.requestId, '--json']);
  if (approvedNode.code !== 0) {
    return { reason: 'node_approve_failed', approved: [match.requestId], deviceId: match.deviceId };
  }
  const policy = await run(['approvals', 'set', '--node', name, '--stdin'], 20000, ASK_EACH_COMMAND);
  if (policy.code !== 0) {
    await run(['nodes', 'remove', '--node', name, '--json']);
    return { reason: 'policy_rejected', approved: [match.requestId], deviceId: match.deviceId };
  }
  return {
    reason: 'paired',
    approved: [match.requestId, commandRequest.requestId],
    deviceId: match.deviceId
  };
}

async function statusProbe(run) {
  const result = await run(probeArgs(), 100000);
  return {
    ...summarizeReply(result.out),
    code: result.code,
    pairingRequired: /pairing required/i.test(result.out)
  };
}

let lastWindowsReason = '';

async function assist(env = process.env, deps = {}) {
  const approve = enabled(env.JARVIS_APPROVE_LOCAL_OPERATOR);
  const probe = enabled(env.JARVIS_STATUS_PROBE);
  const windows = enabled(env.JARVIS_APPROVE_WINDOWS_NODE);
  if (!approve && !probe && !windows) return { reason: 'disabled' };
  const run = deps.run || runCli;
  const ready = deps.ready || gatewayReady;
  if (!(await ready())) return { reason: 'gateway_not_ready' };
  const report = { reason: 'ok' };
  if (approve) {
    report.approved = await approvePending(run);
    for (const requestId of report.approved) {
      console.log('[JARVIS] Approved operator pairing request ' + requestId.slice(0, 8) + '.');
    }
  }
  if (windows) {
    report.windows = await approveWindowsNode(run, env, deps);
    const approved = report.windows.approved || [];
    for (const requestId of approved) {
      console.log('[JARVIS] Approved windows node request ' + requestId.slice(0, 8) + '.');
    }
    if (report.windows.reason !== lastWindowsReason) {
      lastWindowsReason = report.windows.reason;
      if (report.windows.reason !== 'no_pending_windows_node' && report.windows.reason !== 'no_matching_device' && report.windows.reason !== 'paired') {
        const commands = Array.isArray(report.windows.commands) ? report.windows.commands.join(',') : '';
        console.log('[JARVIS] Windows node: ' + report.windows.reason + (commands ? ' ' + commands : '') + '.');
      }
    }
  }
  if (probe && !deps.skipProbe) {
    let probed = await statusProbe(run);
    if (probed.pairingRequired && approve) {
      const again = await approvePending(run);
      report.approved = [...(report.approved || []), ...again];
      for (const requestId of again) {
        console.log('[JARVIS] Approved operator pairing request ' + requestId.slice(0, 8) + '.');
      }
      probed = await statusProbe(run);
    }
    report.probe = probed;
    console.log('[JARVIS] Status probe: ' + JSON.stringify({
      code: report.probe.code,
      online: report.probe.online,
      free: report.probe.free,
      paidAuto: report.probe.paidAuto,
      models: report.probe.models
    }) + '.');
  }
  return report;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  if (!enabled(process.env.JARVIS_APPROVE_LOCAL_OPERATOR) && !enabled(process.env.JARVIS_STATUS_PROBE) && !enabled(process.env.JARVIS_APPROVE_WINDOWS_NODE)) {
    console.log('[JARVIS] Operator assist disabled.');
    return;
  }
  let probed = false;
  for (;;) {
    const report = await assist(process.env, { skipProbe: probed });
    if (report.probe) probed = true;
    if (!enabled(process.env.JARVIS_APPROVE_LOCAL_OPERATOR) && !enabled(process.env.JARVIS_APPROVE_WINDOWS_NODE)) return;
    await sleep(15000);
  }
}

module.exports = {
  assist,
  approvePending,
  approveWindowsNode,
  extractJson,
  probeArgs,
  selectOperatorRequests,
  selectWindowsCommandRequests,
  selectWindowsNodeRequests,
  statusProbe,
  summarizeReply
};

if (require.main === module) {
  main().catch(error => {
    console.log('[JARVIS] Operator assist stopped: ' + error.message);
    process.exitCode = 0;
  });
}
