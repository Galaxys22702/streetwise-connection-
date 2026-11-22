import { validateSignal } from './callingSignalingContract.js';

// In-memory signaling queue for an authenticated, single-process pilot.
// Never expose directly to browsers. API adapters must validate sessions,
// prove device ownership, and authorize both participants before enqueue/read.
export function createSignalingRelay({ authorize, now = Date.now, ttlMs = 60_000, maxMessages = 100 } = {}) {
  if (typeof authorize !== 'function') throw new TypeError('authorization_callback_required');
  if (!Number.isInteger(ttlMs) || ttlMs < 1000 || ttlMs > 300_000) throw new TypeError('ttl_invalid');
  if (!Number.isInteger(maxMessages) || maxMessages < 1 || maxMessages > 1000) throw new TypeError('capacity_invalid');
  const messages = [];

  function expire() {
    const current = now();
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].expiresAt <= current) messages.splice(i, 1);
    }
  }

  async function enqueue({ principal, signal }) {
    const validated = validateSignal(signal);
    if (!principal || !(await authorize({ principal, action: 'send', signal: validated }))) {
      throw new Error('signaling_forbidden');
    }
    expire();
    if (messages.length >= maxMessages) throw new Error('signaling_capacity_exceeded');
    messages.push({ signal: structuredClone(validated), expiresAt: now() + ttlMs });
    return { queued: true };
  }

  async function receive({ principal, deviceId, callId }) {
    if (!principal || typeof deviceId !== 'string' || typeof callId !== 'string' ||
      !(await authorize({ principal, action: 'receive', deviceId, callId }))) {
      throw new Error('signaling_forbidden');
    }
    expire();
    const received = [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const entry = messages[i];
      if (entry.signal.toDeviceId === deviceId && entry.signal.callId === callId) {
        received.push(structuredClone(entry.signal));
        messages.splice(i, 1);
      }
    }
    return received.reverse();
  }

  return { enqueue, receive };
}
