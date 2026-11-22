import { createCustomerProfileBridge } from './callingCustomerProfile.js';
import { createDeviceEnrollment } from './callingDeviceEnrollment.js';
import { createCallingLookups } from './callingDatabaseLookups.js';
import { createSignalingAuthorizer } from './callingSignalingAuthorizer.js';
import { createSignalingRelay } from './callingSignalingRelay.js';

// Explicitly disabled by default. Never expose pilot endpoints unless
// STREETWISE_CALLING_PILOT_ENABLED=true and private DB is migrated.
export function createCallingPilot({ authenticate, ensureCustomerProfile = createCustomerProfileBridge(),
  registerDevice = createDeviceEnrollment(), lookups = createCallingLookups() } = {}) {
  if (typeof authenticate !== 'function') throw new TypeError('authentication_required');
  const authorize = createSignalingAuthorizer(lookups);
  const relay = createSignalingRelay({ authorize });
  return async function handleCallingPilot({ method, pathname, body, request }) {
    if (process.env.STREETWISE_CALLING_PILOT_ENABLED !== 'true') {
      return { status: 404, json: { error: 'not_found' } };
    }
    const principal = await authenticate(request);
    if (!principal?.id) return { status: 401, json: { error: 'authentication_required' } };
    if (method === 'POST' && pathname === '/api/pilot/devices') {
      const profile = await ensureCustomerProfile({ userId: principal.id, email: principal.email });
      const device = await registerDevice({ userId: principal.id, label: body?.label, platform: body?.platform });
      return { status: 201, json: { customerId: profile.id, device } };
    }
    if (method === 'POST' && pathname === '/api/pilot/signals') {
      const result = await relay.enqueue({ principal, signal: body });
      return { status: 202, json: result };
    }
    if (method === 'POST' && pathname === '/api/pilot/signals/receive') {
      const messages = await relay.receive({ principal, deviceId: body?.deviceId, callId: body?.callId });
      return { status: 200, json: { messages } };
    }
    return { status: 404, json: { error: 'not_found' } };
  };
}
