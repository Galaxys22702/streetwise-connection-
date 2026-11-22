# Streetwise core database foundation

This is a **proposed private schema**, not a claim of a live database migration. Existing Supabase project: `streetwise-connection`. The database inspection endpoint refused connections on 2026-11-21; do not apply this file until the existing schema, permissions and backups have been inspected.

## Data model
- `customers`: private customer record, optionally linked to Supabase Auth.
- `service_plans`: draft or pilot offerings, no public activation.
- `subscriptions`: internal draft/pilot subscriptions, no billing action.
- `devices`: device metadata and public-key fingerprints, never tokens or private keys.
- `esim_orders`: internal order lifecycle, no provider provisioning calls.
- `call_sessions`: signaling/session metadata only; no audio recordings.
- `operational_events`: sanitized operational audit events; do not store passwords, tokens, phone call content, or raw personal data in JSON details.

## Security and launch controls
All tables live in `streetwise_core`, not the public API schema. RLS is enabled with no client-facing policies. No grants are given to `anon` or `authenticated`. Backend service access must be designed and verified separately, with least-privilege permissions. This does not activate payments, carrier services, eSIM provisioning, public telephone numbers, or live calls.

## Before applying
1. Reconnect to the existing Supabase project and inventory all schemas/tables.
2. Check backup/restore capability, migration history, and security advisors.
3. Review schema compatibility, especially `auth.users` reference and existing plan/customer models.
4. Apply in authorized staging or an isolated branch first; run SQL smoke checks for tables, RLS, constraints and grants.
5. Only then schedule production migration with a rollback/restore plan. Do not seed customer records or copy secrets.

## Suggested read-only smoke query
```sql
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'streetwise_core' and c.relkind = 'r'
order by c.relname;
```
