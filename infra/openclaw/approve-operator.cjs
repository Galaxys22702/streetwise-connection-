// Approve pending Control UI operator devices from inside the gateway host.
// Node-role requests stay pending. Tokens and full device records are not logged.
const { spawn } = require('node:child_process');

const STATUS_MESSAGE = 'JARVIS, report your operational status and respond with JARVIS ONLINE.';

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

function isOperatorOnly(request) {
  const roles = [];
  if (typeof request.role === 'string' && request.role) roles.push(request.role);
  if (Array.isArray(request.roles)) {
    for (const role of request.roles) {
      if (typeof role === 'string' && role && !roles.includes(role)) roles.push(role);
    }
  }
  return roles.length === 1 && roles[0] === 'operator';
}

function pendingOf(list) {
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
    if (typeof request.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(request.requestId)) continue;
    chosen.push(request.requestId);
    if (chosen.length === 3) break;
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

function runCli(args, timeoutMs = 20000) {
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

async function statusProbe(run) {
  const result = await run(probeArgs(), 100000);
  return {
    ...summarizeReply(result.out),
    code: result.code,
    pairingRequired: /pairing required/i.test(result.out)
  };
}

async function assist(env = process.env, deps = {}) {
  const approve = enabled(env.JARVIS_APPROVE_LOCAL_OPERATOR);
  const probe = enabled(env.JARVIS_STATUS_PROBE);
  if (!approve && !probe) return { reason: 'disabled' };
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
  if (probe && !deps.skipProbe) {
    let probed = await statusProbe(run);
    if (probed.pairingRequired && approve) {
      const again = await approvePending(run);
      report.approved = [...report.approved, ...again];
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
  if (!enabled(process.env.JARVIS_APPROVE_LOCAL_OPERATOR) && !enabled(process.env.JARVIS_STATUS_PROBE)) {
    console.log('[JARVIS] Operator assist disabled.');
    return;
  }
  let probed = false;
  for (;;) {
    const report = await assist(process.env, { skipProbe: probed });
    if (report.probe) probed = true;
    if (!enabled(process.env.JARVIS_APPROVE_LOCAL_OPERATOR)) return;
    await sleep(15000);
  }
}

module.exports = {
  assist,
  approvePending,
  extractJson,
  probeArgs,
  selectOperatorRequests,
  statusProbe,
  summarizeReply
};

if (require.main === module) {
  main().catch(error => {
    console.log('[JARVIS] Operator assist stopped: ' + error.message);
    process.exitCode = 0;
  });
}
