import { randomUUID } from 'node:crypto';
import { query as databaseQuery } from '../db/index.js';

// Server-only pilot device enrollment. A device remains unverified until a
// separate authenticated possession challenge has succeeded.
export function createDeviceEnrollment({ query = databaseQuery } = {}) {
  if (typeof query !== 'function') throw new TypeError('database_query_required');
  return async function registerDevice({ userId, label, platform }) {
    if (typeof userId !== 'string' || !/^usr_[0-9a-f]{32}$/.test(userId)) {
      throw new TypeError('authenticated_user_required');
    }
    if (typeof label !== 'string' || label.trim().length < 1 || label.length > 80) {
      throw new TypeError('device_label_invalid');
    }
    if (!['ios', 'android', 'web', 'other'].includes(platform)) {
      throw new TypeError('device_platform_invalid');
    }
    const id = randomUUID();
    const result = await query(
      `insert into streetwise_core.devices (id, customer_id, device_label, platform)
       select $1, c.id, $2, $3
         from streetwise_core.customers c
        where c.legacy_user_id = $4 and c.status in ('prospect', 'active')
       returning id, device_label, platform, verified_at`,
      [id, label.trim(), platform, userId]
    );
    if (!result.rows[0]) {
      const error = new Error('customer_profile_required');
      error.statusCode = 409;
      throw error;
    }
    const row = result.rows[0];
    return { id: row.id, label: row.device_label, platform: row.platform, verified: false };
  };
}
