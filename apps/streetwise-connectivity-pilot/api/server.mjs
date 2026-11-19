import { createServer } from 'node:http';
import { BlockList, isIP } from 'node:net';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';

function normalizeIp(ip) {
  return typeof ip === 'string' && /^::ffff:\d+\.\d+\.\d+\.\d+$/i.test(ip) ? ip.slice(7) : ip;
}

export function cidrMatcher(value = '') {
  const list = new BlockList();
  for (const entry of value.split(',').map(s => s.trim()).filter(Boolean)) {
    const [address, prefix, extra] = entry.split('/');
    const ip = normalizeIp(address);
    const version = isIP(ip);
    const max = version === 4 ? 32 : 128;
    if (!version || extra !== undefined || (prefix !== undefined && (!/^\d+$/.test(prefix) || Number(prefix) > max))) {
      throw Error('Invalid CBRS_CIDRS entry');
    }
    list.addSubnet(ip, prefix === undefined ? max : Number(prefix), version === 4 ? 'ipv4' : 'ipv6');
  }
  return value => {
    const ip = normalizeIp(value);
    const version = isIP(ip);
    return Boolean(version && list.check(ip, version === 4 ? 'ipv4' : 'ipv6'));
  };
}

async function jsonBody(request) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 4096) throw Error('body_too_large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks));
}

const hash = value => createHash('sha256').update(value).digest();
const objectId = value => typeof value === 'string' ? value : value?.id;
function appleInstallUrl(credentials, sim) {
  if (credentials?.sim !== sim || typeof credentials.iosInstallUrl !== 'string') return null;
  try {
    const url = new URL(credentials.iosInstallUrl);
    if (url.origin !== 'https://esimsetup.apple.com' || url.username || url.password ||
      url.pathname !== '/esim_qrcode_provisioning' ||
      !url.searchParams.get('carddata')?.startsWith('LPA:1$')) return null;
    return url.href;
  } catch { return null; }
}

export function buildServer(env = process.env, providerFetch = fetch, now = Date.now) {
  const allowed = new Set((env.WEB_ORIGINS || 'https://streetwiseconnection.com').split(',').map(s => s.trim()));
  const onNetwork = cidrMatcher(env.CBRS_CIDRS);
  const turnSecret = env.TURN_SHARED_SECRET;
  const turnUrls = (env.TURN_URLS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (turnUrls.some(url => !/^turns?:[^\s]+$/.test(url)) || (turnUrls.length && (!turnSecret || turnSecret.length < 32))) {
    throw Error('TURN configuration is incomplete');
  }
  const live = env.GIGS_ESIM_ENABLED === 'true';
  if (live && (!env.GIGS_TOKEN || !/^[\w-]+$/.test(env.GIGS_PROJECT || '') ||
    !/^sub_[\w-]+$/.test(env.GIGS_SUBSCRIPTION_ID || '') || !/^usr_[\w-]+$/.test(env.GIGS_USER_ID || '') ||
    !/^pln_[\w-]+$/.test(env.GIGS_PLAN_ID || '') || !env.PILOT_EMAIL || !/^\d{5}$/.test(env.PILOT_ZIP || '') ||
    !env.PILOT_PLAN || (env.PILOT_ACCESS_CODE || '').length < 32)) throw Error('Authorized Gigs pilot configuration is incomplete');
  const windows = new Map();
  const quota = (key, time, limit) => {
    const expired = Math.floor(now() / time);
    for (const [entry, state] of windows) if (state.until <= now()) windows.delete(entry);
    let bucket = windows.get(key);
    if (!bucket) {
      if (windows.size >= 4000) return false;
      bucket = {count:0,until:(expired + 1) * time};
      windows.set(key,bucket);
    }
    if (bucket.count >= limit) return false;
    bucket.count++;
    return true;
  };

  async function gigs(path) {
    const result = await providerFetch('https://api.gigs.com/projects/' + env.GIGS_PROJECT + '/' + path,{
      headers:{ Authorization:'Bearer ' + env.GIGS_TOKEN, Accept:'application/json' },
      signal:AbortSignal.timeout(9000), redirect:'error'
    });
    if (!result.ok) throw Error('provider_unavailable');
    return result.json();
  }

  return createServer({ requestTimeout:15_000 }, async (req,res) => {
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    const origin = req.headers.origin;
    if (origin && allowed.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin',origin);
      res.setHeader('Vary','Origin');
    }
    const reply = (status, body) => {
      res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});
      res.end(JSON.stringify(body));
    };
    const originOK = Boolean(origin && allowed.has(origin));
    if (req.method === 'OPTIONS') {
      if (!originOK) return reply(403,{error:'origin_denied'});
      res.writeHead(204,{'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers':'Content-Type,X-Pilot-Code','Access-Control-Max-Age':'600'}); return res.end();
    }
    const peer = normalizeIp(req.socket.remoteAddress);
    const observed = env.TRUST_LOOPBACK_PROXY === 'true' && peer === '127.0.0.1' &&
      isIP(normalizeIp(req.headers['x-real-ip'] || '')) ? normalizeIp(req.headers['x-real-ip']) : peer;
    if (req.method === 'GET' && req.url === '/v1/status') return reply(200,{turn_ready:turnUrls.length > 0,esim_ready:live});
    if (req.method === 'GET' && req.url === '/healthz') return reply(200,{ok:true});
    if (req.method === 'GET' && req.url === '/v1/check-network') return reply(200,{is_cbrs:onNetwork(observed)});
    if (req.method === 'POST' && req.url === '/v1/turn') {
      if (!originOK) return reply(403,{error:'origin_denied'});
      if (!turnUrls.length) return reply(503,{error:'turn_not_configured'});
      if (!quota('turn:' + observed,60_000,4)) return reply(429,{error:'try_again_later'});
      const username = Math.floor(now() / 1000 + 180) + ':' + randomBytes(9).toString('hex');
      const credential = createHmac('sha1',turnSecret).update(username).digest('base64');
      return reply(200,{iceServers:[{urls:turnUrls,username,credential}]});
    }
    if (req.method === 'POST' && req.url === '/v1/esim') {
      if (!originOK) return reply(403,{error:'origin_denied'});
      if (!live) return reply(503,{error:'esim_pilot_closed'});
      if (!quota('esim:' + observed,60_000,4)) return reply(429,{error:'try_again_later'});
      const code = req.headers['x-pilot-code'];
      if (typeof code !== 'string' || !timingSafeEqual(hash(code),hash(env.PILOT_ACCESS_CODE))) {
        return reply(403,{error:'pilot_access_required'});
      }
      if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return reply(415,{error:'json_required'});
      let body;
      try { body = await jsonBody(req); } catch { return reply(400,{error:'invalid_request'}); }
      if (typeof body?.email !== 'string' || body.email.trim().toLowerCase() !== env.PILOT_EMAIL.trim().toLowerCase() ||
        body.zip !== env.PILOT_ZIP || body.plan !== env.PILOT_PLAN) return reply(403,{error:'pilot_request_mismatch'});
      try {
        const subscription = await gigs('subscriptions/' + env.GIGS_SUBSCRIPTION_ID);
        const sim = objectId(subscription.sim);
        if (subscription.id !== env.GIGS_SUBSCRIPTION_ID || objectId(subscription.user) !== env.GIGS_USER_ID ||
            objectId(subscription.plan) !== env.GIGS_PLAN_ID || !/^sim_[\w-]+$/.test(sim || '') ||
            subscription.status !== 'active') return reply(409,{error:'subscription_not_ready'});
        const install = appleInstallUrl(await gigs('sims/' + sim + '/credentials'),sim);
        return install ? reply(200,{smdp_url:install}) : reply(409,{error:'install_not_available'});
      } catch {
        return reply(502,{error:'provider_unavailable'});
      }
    }
    return reply(404,{error:'not_found'});
  });
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const port = Number(process.env.PORT || 4180);
  buildServer().listen(port,'127.0.0.1',() => console.log('Streetwise API listening on port ' + port));
}
