import { query as databaseQuery } from '../db/index.js';

// Private server-side read adapter. No public endpoint or client DB grants.
// Returns only fields needed to authorize signaling, never customer email,
// tokens, SDP, device fingerprints or other sensitive records.
export function createCallingLookups({ query = databaseQuery } = {}) {
  if (typeof query !== 'function') throw new TypeError('database_query_required');
  return {
    async findDevice(deviceId) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(deviceId))) return null;
      const result = await query(
        `select d.id, c.legacy_user_id, d.revoked_at
           from streetwise_core.devices d
           join streetwise_core.customers c on c.id = d.customer_id
          where d.id = $1 and d.verified_at is not null
          limit 1`,
        [deviceId]
      );
      const row = result.rows[0];
      return row ? { ownerUserId: row.legacy_user_id, revokedAt: row.revoked_at } : null;
    },
    async findCall(callId) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(callId))) return null;
      const result = await query(
        `select caller_device_id, callee_device_id, state
           from streetwise_core.call_sessions
          where id = $1 limit 1`,
        [callId]
      );
      const row = result.rows[0];
      return row ? { callerDeviceId: row.caller_device_id, calleeDeviceId: row.callee_device_id, state: row.state } : null;
    }
  };
}
