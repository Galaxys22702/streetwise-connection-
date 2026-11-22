import { randomUUID } from 'node:crypto';

// Internal signaling contract only. Not a public calling endpoint.
// The eventual implementation must authenticate both devices, authorize the
// call, persist lifecycle events and enforce abuse/rate limits.
export const SIGNAL_TYPES = Object.freeze(['offer', 'answer', 'ice-candidate', 'hangup']);
export const CALL_STATES = Object.freeze(['initiated', 'ringing', 'connected', 'ended', 'failed']);

export function validateSignal(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('signal_object_required');
  }
  const { callId, fromDeviceId, toDeviceId, type, payload } = input;
  for (const [name, value] of Object.entries({ callId, fromDeviceId, toDeviceId })) {
    if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      throw new TypeError(name + '_invalid');
    }
  }
  if (fromDeviceId === toDeviceId) throw new TypeError('self_call_not_allowed');
  if (!SIGNAL_TYPES.includes(type)) throw new TypeError('signal_type_invalid');
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new TypeError('signal_payload_invalid');
  }
  const serialized = JSON.stringify(payload);
  if (!serialized || Buffer.byteLength(serialized, 'utf8') > 16_384) {
    throw new TypeError('signal_payload_too_large');
  }
  if (type === 'hangup' && Object.keys(payload).length !== 0) {
    throw new TypeError('hangup_payload_must_be_empty');
  }
  return { callId, fromDeviceId, toDeviceId, type, payload };
}

export function createCallId() {
  return randomUUID();
}

export function canTransitionCall(from, to) {
  const transitions = {
    initiated: ['ringing', 'failed', 'ended'],
    ringing: ['connected', 'failed', 'ended'],
    connected: ['ended', 'failed'],
    ended: [],
    failed: []
  };
  return transitions[from]?.includes(to) === true;
}
