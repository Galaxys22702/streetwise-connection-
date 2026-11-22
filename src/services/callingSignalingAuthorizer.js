// Authorization adapter for pilot signaling. Device and call membership must
// come from trusted database queries, never request-supplied identity fields.
export function createSignalingAuthorizer({ findDevice, findCall }) {
  if (typeof findDevice !== 'function' || typeof findCall !== 'function') {
    throw new TypeError('trusted_lookup_required');
  }
  return async function authorize({ principal, action, signal, deviceId, callId }) {
    if (!principal || typeof principal.id !== 'string' || !['send', 'receive'].includes(action)) return false;
    const targetDeviceId = action === 'send' ? signal?.fromDeviceId : deviceId;
    const targetCallId = action === 'send' ? signal?.callId : callId;
    if (typeof targetDeviceId !== 'string' || typeof targetCallId !== 'string') return false;
    const [device, call] = await Promise.all([findDevice(targetDeviceId), findCall(targetCallId)]);
    if (!device || !call || device.revokedAt || device.ownerUserId !== principal.id) return false;
    if (!['initiated', 'ringing', 'connected'].includes(call.state)) return false;
    if (call.callerDeviceId !== targetDeviceId && call.calleeDeviceId !== targetDeviceId) return false;
    if (action === 'send' && signal?.toDeviceId !== (call.callerDeviceId === targetDeviceId ? call.calleeDeviceId : call.callerDeviceId)) return false;
    return true;
  };
}
