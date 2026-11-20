const inviteMs = 15 * 60_000;
const callMs = 60 * 60_000;
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), n => n.toString(16).padStart(2, '0')).join('');
const validKey = value => /^[a-f0-9]{48}$/.test(value || '');
const keyHash = async value => Array.from(
  new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))),
  n => n.toString(16).padStart(2, '0')
).join('');
const headers = {
  'Cache-Control':'no-store', 'Referrer-Policy':'no-referrer',
  'X-Content-Type-Options':'nosniff',
  'Permissions-Policy':'microphone=(self), camera=(), geolocation=()',
  'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; media-src 'self' blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
};
const json = (data, status = 200) => Response.json(data, { status, headers });
const fail = (error, status) => json({ error }, status);

async function signalPayload(request) {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let raw = '';
  for (;;) {
    const next = await reader.read();
    if (next.done) break;
    size += next.value.byteLength;
    if (size > 20_000) {
      await reader.cancel();
      return null;
    }
    raw += decoder.decode(next.value, { stream:true });
  }
  try {
    const data = JSON.parse(raw + decoder.decode());
    if (typeof data?.messageId !== 'string' || !/^[a-f0-9-]{36}$/.test(data.messageId)) return null;
    if (['offer','answer'].includes(data.type) && typeof data.sdp === 'string' && data.sdp.startsWith('v=0')) {
      return { type:data.type, sdp:data.sdp, messageId:data.messageId };
    }
    if (data.type === 'ice' && data.candidate === null) return { type:'ice', candidate:null, messageId:data.messageId };
    const c = data.candidate;
    if (data.type === 'ice' && c && typeof c.candidate === 'string' && c.candidate.startsWith('candidate:') &&
      c.candidate.length <= 2000 && (typeof c.sdpMid === 'string' || Number.isInteger(c.sdpMLineIndex)) &&
      JSON.stringify(c).length <= 2500) {
      return { type:'ice', candidate:c, messageId:data.messageId };
    }
  } catch {
    return null;
  }
  return null;
}

async function openRoom(db, user, now) {
  const roomId = token();
  const key = token();
  const invitation = token();
  await db.prepare('DELETE FROM call_rooms WHERE expires <= ?').bind(now).run();
  const result = await db.prepare(
    "INSERT INTO call_rooms (id,owner,host_key,guest_key,phase,expires) SELECT ?,?,?,?,'waiting',? WHERE (SELECT COUNT(*) FROM call_rooms WHERE owner=? AND expires>? AND phase<>'ended') < 4"
  ).bind(roomId,user,await keyHash(key),await keyHash(invitation),now + inviteMs,user,now).run();
  return result.meta.changes ? json({ roomId,key,invitation,iceServers:[] },201) : fail('room_limit',429);
}

async function roomAction(request, db, id, action, url) {
  const method = action === 'events' ? 'GET' : 'POST';
  if (request.method !== method) return fail('method_not_allowed',405);
  const key = request.headers.get('X-Room-Key');
  if (!validKey(key)) return fail('room_unavailable',404);
  const digest = await keyHash(key);
  const body = action === 'signal' && await signalPayload(request);
  if (action === 'signal' && !body) return fail('invalid_signal',400);
  for (let attempt = 0; attempt < 5; attempt++) {
    const now = Date.now();
    const row = await db.prepare('SELECT * FROM call_rooms WHERE id=? AND expires>?').bind(id,now).first();
    if (!row) return fail('room_unavailable',404);
    const role = digest === row.host_key ? 'host' : digest === row.guest_key ? 'guest' : null;
    if (!role) return fail('room_unavailable',404);
    let events = JSON.parse(row.messages);
    if (action === 'events') {
      if (role === 'guest' && row.phase === 'waiting') return fail('join_required',409);
      const after = Number(url.searchParams.get('after') || 0);
      if (!Number.isSafeInteger(after) || after < 0) return fail('invalid_cursor',400);
      return json({ events:events.filter(e => e.from !== role && e.id > after) });
    }
    const nextId = (events.at(-1)?.id || 0) + 1;
    let phase = row.phase;
    let guestKey = row.guest_key;
    let expires = row.expires;
    let response = {};
    if (action === 'join') {
      if (role !== 'guest' || phase !== 'waiting') return fail('invite_used',409);
      const guest = token();
      guestKey = await keyHash(guest);
      phase = 'joined';
      expires = now + callMs;
      response = { key:guest, iceServers:[] };
      events.push({ id:nextId, from:role, type:'ready' });
    } else if (action === 'leave') {
      if (phase === 'ended') return json({});
      if (role === 'guest' && phase === 'waiting') return fail('join_required',409);
      phase = 'ended';
      expires = now + 60_000;
      events = [{ id:nextId, from:role, type:'ended' }];
    } else {
      if (phase === 'ended') return fail('call_ended',409);
      const duplicate = events.find(e => e.from === role && e.messageId === body.messageId);
      if (duplicate) {
        const { id: previousId, from, ...old } = duplicate;
        return JSON.stringify(old) === JSON.stringify(body) ? json({ id:previousId }) : fail('message_id_conflict',409);
      }
      if (body.type === 'offer') {
        if (role !== 'host' || phase !== 'joined') return fail('unexpected_offer',409);
        phase = 'offered';
      } else if (body.type === 'answer') {
        if (role !== 'guest' || phase !== 'offered') return fail('unexpected_answer',409);
        phase = 'answered';
      } else {
        const sent = events.filter(e => e.type === 'ice' && e.from === role);
        const canSend = phase === 'answered' || (phase === 'offered' && role === 'host');
        if (!canSend || sent.some(e => e.candidate === null)) return fail('unexpected_ice',409);
        if (body.candidate && sent.length >= 48) return fail('candidate_limit',429);
      }
      events.push({ id:nextId, from:role, ...body });
      response = { id:nextId };
    }
    const updated = await db.prepare(
      'UPDATE call_rooms SET guest_key=?,phase=?,expires=?,messages=?,revision=revision+1 WHERE id=? AND revision=? AND expires>?'
    ).bind(guestKey,phase,expires,JSON.stringify(events),id,row.revision,now).run();
    if (updated.meta.changes) return json(response);
  }
  return fail('busy',503);
}

export function makeWorker(assets) {
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      if (request.method === 'GET' && Object.hasOwn(assets,url.pathname)) {
        const asset = assets[url.pathname];
        return new Response(asset.body, { headers:{ ...headers, 'Content-Type':asset.contentType } });
      }
      if (request.method === 'GET' && url.pathname === '/api/health') {
        try {
          await env.DB.prepare('SELECT id FROM call_rooms LIMIT 1').first();
          return json({ status:'ready' });
        } catch {
          return fail('storage_unavailable',503);
        }
      }
      const user = request.headers.get('oai-authenticated-user-id');
      if (!user) return fail('sign_in_required',401);
      if (request.headers.get('X-Streetwise') !== '1' ||
        (request.headers.has('Origin') && request.headers.get('Origin') !== url.origin)) {
        return fail('same_origin_required',403);
      }
      try {
        if (url.pathname === '/rooms' && request.method === 'POST') return await openRoom(env.DB,user,Date.now());
        const match = /^\/rooms\/([a-f0-9]{48})\/(join|events|signal|leave)$/.exec(url.pathname);
        if (!match) return fail('not_found',404);
        return await roomAction(request,env.DB,match[1],match[2],url);
      } catch {
        return fail('storage_unavailable',503);
      }
    }
  };
}
