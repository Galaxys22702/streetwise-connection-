const element = id => document.getElementById(id);
const fragment = new URLSearchParams(location.hash.slice(1));
const invite = fragment.has('room') && fragment.has('invite')
  ? { roomId: fragment.get('room'), key: fragment.get('invite') }
  : null;
if (invite) history.replaceState(null, '', location.pathname);
let active = null;
const status = message => { element('status').textContent = message; };

async function request(path, { key, method = 'POST', body, keepalive = false } = {}) {
  const response = await fetch(path, {
    method, keepalive,
    signal: keepalive ? undefined : AbortSignal.timeout(12_000),
    headers: { 'X-Streetwise': '1', ...(key && { 'X-Room-Key': key }), ...(body && { 'Content-Type': 'application/json' }) },
    body: body && JSON.stringify(body)
  });
  const result = await response.json();
  if (!response.ok) {
    const error = Error(result.error);
    error.status = response.status;
    throw error;
  }
  return result;
}

function roomRequest(call, action, options) {
  return request('/rooms/' + call.roomId + '/' + action, { key: call.key, ...options });
}

function stop(call, message, notify = false) {
  if (!call || active !== call) return;
  active = null;
  if (notify && call.roomId) roomRequest(call, 'leave', { keepalive: true }).catch(() => {});
  clearTimeout(call.poll);
  clearTimeout(call.mediaTimer);
  element('media-status').hidden = true;
  call.pc?.close();
  call.stream?.getTracks().forEach(track => track.stop());
  element('share').hidden = true;
  element('controls').hidden = true;
  element('listen').hidden = true;
  element('remote').srcObject = null;
  element('start').disabled = false;
  element('start').hidden = false;
  status(message);
}

async function monitorMedia(call) {
  if (active !== call) return;
  const display = element('media-status');
  display.hidden = false;
  try {
    const stats = await call.pc.getStats();
    if (active !== call) return;
    const inbound = [...stats.values()].some(report => report.type === 'inbound-rtp' &&
      (report.kind || report.mediaType) === 'audio' && report.packetsReceived > 0);
    display.textContent = call.pc.connectionState === 'connected'
      ? inbound ? 'Incoming WebRTC audio packets confirmed.' : 'Connected. Waiting for incoming audio packets…'
      : 'Audio route is connecting…';
  } catch {
    display.textContent = 'This browser did not return audio statistics.';
  }
  if (active === call) call.mediaTimer = setTimeout(() => monitorMedia(call),1000);
}

async function playAudio() {
  try {
    await element('remote').play();
    element('listen').hidden = true;
  } catch {
    element('listen').hidden = !active;
  }
}

async function retry(call, operation) {
  const delays = [350, 750, 1500, 3000];
  for (const delay of [...delays, null]) {
    if (active !== call) return;
    try {
      return await operation();
    } catch (error) {
      if (delay === null || (error.status && error.status < 500)) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

function publish(call, payload) {
  const body = { ...payload, messageId: crypto.randomUUID() };
  return retry(call, () => roomRequest(call, 'signal', { body }));
}

function flushIce(call) {
  if (!call.localSent || call.iceSending || active !== call) return;
  call.iceSending = true;
  (async () => {
    while (active === call && call.outboundIce.length) {
      const candidate = call.outboundIce.shift();
      await publish(call, { type: 'ice', candidate });
    }
  })().catch(() => stop(call, 'Call signaling was interrupted. Start a fresh call.', true))
    .finally(() => {
      call.iceSending = false;
      if (call.outboundIce.length) flushIce(call);
    });
}

async function signal(call, kind) {
  const description = kind === 'offer' ? await call.pc.createOffer() : await call.pc.createAnswer();
  if (active !== call) return;
  await call.pc.setLocalDescription(description);
  // Publish the offer/answer as generated, before gathered candidates modify localDescription.
  await publish(call, { type: description.type, sdp: description.sdp });
  if (active !== call) return;
  call.localSent = true;
  flushIce(call);
}

async function poll(call) {
  try {
    const result = await retry(call, () => roomRequest(call, 'events?after=' + call.cursor, { method: 'GET' }));
    if (active !== call || !result) return;
    const { events } = result;
    if (events.some(event => event.type === 'ended')) return stop(call, 'The other person ended the call.');
    for (const event of events) {
      if (active !== call) return;
      switch (event.type) {
        case 'ready':
          call.waitingForGuest = false;
          element('share').hidden = true;
          status('The other person joined. Connecting audio…');
          await signal(call, 'offer');
          break;
        case 'offer':
          await call.pc.setRemoteDescription({ type: event.type, sdp: event.sdp });
          await signal(call, 'answer');
          break;
        case 'answer':
          await call.pc.setRemoteDescription({ type: event.type, sdp: event.sdp });
          break;
        case 'ice':
          await call.pc.addIceCandidate(event.candidate);
          break;
      }
      call.cursor = event.id;
    }
    if (active === call) call.poll = setTimeout(() => poll(call), call.pc.connectionState === 'connected' ? 1000 : 400);
  } catch (error) {
    const message = error.message === 'room_unavailable'
      ? 'This room expired or is no longer available.'
      : 'The call could not connect. Start a fresh call or ask for a new invite.';
    stop(call, message, true);
  }
}

element('start').addEventListener('click', async () => {
  if (active) return;
  if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
    status('Open the call in a browser that supports WebRTC, using HTTPS or localhost.');
    return;
  }
  const call = { cursor: 0, outboundIce: [], iceCandidateCount: 0, waitingForGuest: !invite };
  active = call;
  element('start').disabled = true;
  status('Waiting for microphone permission…');
  try {
    call.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const room = invite ? await roomRequest(invite, 'join') : await request('/rooms');
    call.roomId = invite?.roomId || room.roomId;
    call.key = room.key;
    call.pc = new RTCPeerConnection({ iceServers: room.iceServers });
    call.pc.addEventListener('icecandidate', event => {
      if (active !== call) return;
      if (event.candidate) {
        if (!event.candidate.candidate || call.iceCandidateCount >= 48) return;
        call.iceCandidateCount += 1;
      }
      call.outboundIce.push(event.candidate?.toJSON() ?? null);
      flushIce(call);
    });
    call.stream.getTracks().forEach(track => call.pc.addTrack(track, call.stream));
    call.pc.addEventListener('track', event => {
      if (active !== call) return;
      element('remote').srcObject = event.streams[0] || new MediaStream([event.track]);
      playAudio();
    });
    call.pc.addEventListener('connectionstatechange', () => {
      if (active !== call) return;
      switch (call.pc.connectionState) {
        case 'connected': status('Connected over the internet.'); break;
        case 'disconnected': status('Connection interrupted. Waiting for the network…'); break;
        case 'failed': stop(call, 'The networks could not connect directly. Try another network or use a TURN-enabled deployment.', true); break;
      }
    });
    element('controls').hidden = false;
    element('mute').textContent = 'Mute';
    element('mute').setAttribute('aria-pressed', 'false');
    element('start').hidden = true;
    if (invite) {
      status('Invite accepted. Connecting audio…');
    } else {
      const url = new URL(location.href);
      url.hash = new URLSearchParams({ room: call.roomId, invite: room.invitation });
      element('invite').value = url.href;
      element('share').hidden = false;
      status('Waiting for the other person. The invite expires in 15 minutes.');
    }
    poll(call);
    monitorMedia(call);
  } catch (error) {
    const message = ['NotAllowedError', 'NotFoundError', 'NotReadableError'].includes(error.name)
      ? 'Microphone access failed. Check your browser permissions and microphone.'
      : ['invite_used', 'room_unavailable'].includes(error.message)
        ? 'This invite is unavailable. Ask the caller for a new link.'
        : 'Could not start the call. Check the server and try again.';
    stop(call, message, true);
  }
});
element('copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(element('invite').value);
    status('Invite copied. Share it with the person you want to call.');
  } catch {
    element('invite').select();
    status('Copy the selected invite link and share it with the other person.');
  }
});
element('mute').addEventListener('click', () => {
  if (!active) return;
  const track = active.stream.getAudioTracks()[0];
  track.enabled = !track.enabled;
  element('mute').textContent = track.enabled ? 'Mute' : 'Unmute';
  element('mute').setAttribute('aria-pressed', String(!track.enabled));
});
element('end').addEventListener('click', () => stop(active, 'Call ended.', true));
element('listen').addEventListener('click', playAudio);
addEventListener('pagehide', () => {
  if (active?.roomId && !active.waitingForGuest) stop(active, 'Call ended.', true);
});
if (invite) {
  element('title').textContent = 'Join a voice call';
  element('start').textContent = 'Join call';
}
