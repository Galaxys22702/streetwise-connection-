// Approve pending Control UI operator devices from inside the gateway host.
// Node-role requests stay pending. Tokens and full device records are not logged.
const { spawn } = require('node:child_process');

const STATUS_MESSAGE = 'Reply with exactly JARVIS ONLINE.';

function enabled(value) {
  return value === '1';
}

// Repeated idle polls must not flood logs or hide actual pairing failures.
// Still poll for new requests; only the expected empty-list message is throttled.
function createNoPendingLogGate({ now = Date.now, intervalMs = 60 * 60 * 1000 } = {}) {
  let lastAt = null;
  return () => {
    const current = now();
    if (!Number.isFinite(current)) return false;
    if (lastAt !== null && current >= lastAt && current - lastAt < intervalMs) return false;
    lastAt = current;
    return true;
  };
}
const shouldLogNoPending = createNoPendingLogGate();

function extractJson(text) {
  const raw = String(text || '');
  for (let index = raw.lastIndexOf('{'); index >= 0; index = index > 0 ? raw.lastIndexOf('{', index - 1) : -1) {
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

function pendingRoleSummary(list) {
  const summary = { total: 0, operatorOnly: 0, nodeOrMixed: 0, missingOrOtherRole: 0 };
  for (const request of pendingOf(list)) {
    summary.total++;
    if (request && isOperatorOnly(request)) summary.operatorOnly++;
    else if (request && (request.role === 'node' ||
      (Array.isArray(request.roles) && request.roles.includes('node')))) summary.nodeOrMixed++;
    else summary.missingOrOtherRole++;
  }
  return summary;
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

function summarizeReply(text, code = 0) {
  const raw = String(text || '');
  const envelope = extractJson(raw);
  const result = envelope?.result;
  const meta = result?.meta;
  const agentMeta = meta?.agentMeta;
  const model = agentMeta?.provider === 'openrouter' && typeof agentMeta.model === 'string'
    ? agentMeta.model.replace(/^openrouter\/(?=openrouter\/)/, '') : '';
  const free = model === 'openrouter/free';
  const paidAuto = model === 'openrouter/auto';
  const status = envelope?.status;
  const stop = meta?.stopReason ?? meta?.finishReason ?? agentMeta?.stopReason;
  const finalStop = stop === undefined || stop === null || ['stop', 'end_turn', 'completed', 'ok'].includes(stop);
  const fallbackAttempts = agentMeta?.fallbackAttempts;
  const noFallback = fallbackAttempts == null ||
    (Array.isArray(fallbackAttempts) && fallbackAttempts.length === 0);
  const prefix = raw.slice(0, Math.max(0, raw.indexOf('{')));
  const hasErrorMarker = /pairing required|HTTP\s*40[02]|HTTP\s*429|rate.limit|quota exceeded|timed out|(?:^|\n)\s*(?:error|fatal|warning|warn)\b/i.test(prefix);
  const completed = code === 0 &&
    (status === 'ok' || status === 'completed') &&
    !!result && typeof result === 'object' &&
    result.status !== 'error' && !envelope.error && !result.error &&
    meta?.aborted !== true && meta?.yielded !== true &&
    noFallback && finalStop && !hasErrorMarker;
  const payloads = Array.isArray(result?.payloads) ? result.payloads : [];
  const online = !!completed && free &&
    payloads.length === 1 &&
    payloads[0] && !payloads[0].isError && payloads[0].isReasoning !== true &&
    payloads[0].isCommentary !== true && payloads[0].visible !== false &&
    typeof payloads[0].text === 'string' && payloads[0].text.trim() === 'JARVIS ONLINE';
  return { online, free, paidAuto, models: free || paidAuto ? ['openrouter/' + model] : [] };
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
    const response = await fetchImpl(`http://127.0.0.1:${port}/setup/healthz`, { signal: AbortSignal.timeout(5000) });
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
  if (!parsed) {
    console.log('[JARVIS] Operator assist: device list did not return parseable JSON (exit=' + listed.code + ').');
    return [];
  }
  const approved = [];
  const candidates = selectOperatorRequests(parsed);
  if (listed.code !== 0) console.log('[JARVIS] Operator assist: device list failed (exit=' + listed.code + ').');
  else if (!candidates.length && shouldLogNoPending()) console.log('[JARVIS] Operator assist: no eligible operator-only requests; pending role counts=' + JSON.stringify(pendingRoleSummary(parsed)) + '.');
  for (const requestId of candidates) {
    const result = await run(['devices', 'approve', requestId, '--json']);
    if (result.code === 0 && !/pairing required/i.test(result.out)) approved.push(requestId);
    else console.log('[JARVIS] Operator assist: approval failed for request ' + requestId.slice(0, 8) + ' (exit=' + result.code + ').');
  }
  return approved;
}

async function statusProbe(run) {
  const result = await run(probeArgs(), 100000);
  return {
    ...summarizeReply(result.out, result.code),
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
      // Do not make a second inference attempt during startup.
      // A separate explicitly authorized verification is required after pairing.
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

async function main(env = process.env, deps = {}) {
  if (!enabled(env.JARVIS_APPROVE_LOCAL_OPERATOR) && !enabled(env.JARVIS_STATUS_PROBE)) {
    console.log('[JARVIS] Operator assist disabled.');
    return;
  }
  let probed = false;
  let checks = 0;
  for (;;) {
    const report = await assist(env, { ...deps, skipProbe: probed });
    if (report.probe) probed = true;
    if (!enabled(env.JARVIS_APPROVE_LOCAL_OPERATOR)) {
      if (probed) return;
      if (++checks >= 12) {
        console.log('[JARVIS] Status probe: gateway readiness timed out.');
        return;
      }
    }
    await (deps.sleep || sleep)(15000);
  }
}

module.exports = {
  main,
  assist,
  approvePending,
  createNoPendingLogGate,
  extractJson,
  probeArgs,
  selectOperatorRequests,
  pendingRoleSummary,
  statusProbe,
  summarizeReply
};

if (require.main === module) {
  main().catch(error => {
    console.log('[JARVIS] Operator assist stopped: ' + error.message);
    process.exitCode = 0;
  });
}
