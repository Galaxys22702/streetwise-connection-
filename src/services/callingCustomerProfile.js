import { query as databaseQuery } from '../db/index.js';

// Idempotent account-to-private-profile bridge. Only server-side callers
// holding an authenticated user from authService may invoke this function.
export function createCustomerProfileBridge({ query = databaseQuery } = {}) {
  if (typeof query !== 'function') throw new TypeError('database_query_required');
  return async function ensureCustomerProfile({ userId, email }) {
    if (typeof userId !== 'string' || !/^usr_[0-9a-f]{32}$/.test(userId)) {
      throw new TypeError('authenticated_user_required');
    }
    if (typeof email !== 'string' || email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      throw new TypeError('valid_email_required');
    }
    const result = await query(
      `insert into streetwise_core.customers (legacy_user_id, contact_email)
       values ($1, $2)
       on conflict (legacy_user_id) do update
         set updated_at = now()
       returning id, status`,
      [userId, email.trim().toLowerCase()]
    );
    const row = result.rows[0];
    return { id: row.id, status: row.status };
  };
}
