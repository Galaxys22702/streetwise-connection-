-- Streetwise Connection: private operational foundation (staging-first).
-- No payments, provisioning, carrier access, or public API grants are enabled.
-- Dedicated schema avoids collisions with existing public/auth tables.
create schema if not exists streetwise_core;
revoke all on schema streetwise_core from public, anon, authenticated;

create table if not exists streetwise_core.customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  legacy_user_id text unique,
  constraint legacy_user_id_format check (legacy_user_id is null or legacy_user_id ~ '^usr_[0-9a-f]{32}  contact_email text,
  display_name text,
  status text not null default 'prospect' check (status in ('prospect','active','suspended','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_email_length check (contact_email is null or length(contact_email) <= 254)
);
create table if not exists streetwise_core.service_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  display_name text not null,
  monthly_price_cents integer check (monthly_price_cents is null or monthly_price_cents >= 0),
  currency char(3) not null default 'USD',
  lifecycle text not null default 'draft' check (lifecycle in ('draft','pilot','retired')),
  provider_reference text,
  created_at timestamptz not null default now()
);
create table if not exists streetwise_core.subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references streetwise_core.customers(id),
  plan_id uuid not null references streetwise_core.service_plans(id),
  status text not null default 'draft' check (status in ('draft','pending','pilot','suspended','ended')),
  external_subscription_id text unique,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists subscriptions_customer_idx on streetwise_core.subscriptions(customer_id);
create table if not exists streetwise_core.devices (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references streetwise_core.customers(id),
  device_label text,
  platform text check (platform in ('ios','android','web','other')),
  public_key_fingerprint text unique,
  verified_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists devices_customer_idx on streetwise_core.devices(customer_id);
create table if not exists streetwise_core.esim_orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references streetwise_core.customers(id),
  subscription_id uuid references streetwise_core.subscriptions(id),
  provider text,
  provider_order_id text unique,
  status text not null default 'draft' check (status in ('draft','pending','failed','cancelled','pilot')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists esim_orders_customer_idx on streetwise_core.esim_orders(customer_id);
create table if not exists streetwise_core.call_sessions (
  id uuid primary key default gen_random_uuid(),
  caller_device_id uuid references streetwise_core.devices(id),
  callee_device_id uuid references streetwise_core.devices(id),
  transport text not null default 'webrtc' check (transport in ('webrtc','custom_udp','unknown')),
  state text not null default 'initiated' check (state in ('initiated','ringing','connected','ended','failed')),
  started_at timestamptz not null default now(),
  connected_at timestamptz,
  ended_at timestamptz,
  failure_code text,
  constraint call_participant_present check (caller_device_id is not null or callee_device_id is not null)
);
create index if not exists call_sessions_started_idx on streetwise_core.call_sessions(started_at desc);
create table if not exists streetwise_core.operational_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  severity text not null default 'info' check (severity in ('info','warning','error')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists operational_events_created_idx on streetwise_core.operational_events(created_at desc);

-- Defense in depth: no direct client role access or permissive policies.
alter table streetwise_core.customers enable row level security;
alter table streetwise_core.service_plans enable row level security;
alter table streetwise_core.subscriptions enable row level security;
alter table streetwise_core.devices enable row level security;
alter table streetwise_core.esim_orders enable row level security;
alter table streetwise_core.call_sessions enable row level security;
alter table streetwise_core.operational_events enable row level security;
revoke all on all tables in schema streetwise_core from anon, authenticated;
revoke all on all sequences in schema streetwise_core from anon, authenticated;
),
  contact_email text,
  display_name text,
  status text not null default 'prospect' check (status in ('prospect','active','suspended','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_email_length check (contact_email is null or length(contact_email) <= 254)
);
create table if not exists streetwise_core.service_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  display_name text not null,
  monthly_price_cents integer check (monthly_price_cents is null or monthly_price_cents >= 0),
  currency char(3) not null default 'USD',
  lifecycle text not null default 'draft' check (lifecycle in ('draft','pilot','retired')),
  provider_reference text,
  created_at timestamptz not null default now()
);
create table if not exists streetwise_core.subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references streetwise_core.customers(id),
  plan_id uuid not null references streetwise_core.service_plans(id),
  status text not null default 'draft' check (status in ('draft','pending','pilot','suspended','ended')),
  external_subscription_id text unique,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists subscriptions_customer_idx on streetwise_core.subscriptions(customer_id);
create table if not exists streetwise_core.devices (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references streetwise_core.customers(id),
  device_label text,
  platform text check (platform in ('ios','android','web','other')),
  public_key_fingerprint text unique,
  verified_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists devices_customer_idx on streetwise_core.devices(customer_id);
create table if not exists streetwise_core.esim_orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references streetwise_core.customers(id),
  subscription_id uuid references streetwise_core.subscriptions(id),
  provider text,
  provider_order_id text unique,
  status text not null default 'draft' check (status in ('draft','pending','failed','cancelled','pilot')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists esim_orders_customer_idx on streetwise_core.esim_orders(customer_id);
create table if not exists streetwise_core.call_sessions (
  id uuid primary key default gen_random_uuid(),
  caller_device_id uuid references streetwise_core.devices(id),
  callee_device_id uuid references streetwise_core.devices(id),
  transport text not null default 'webrtc' check (transport in ('webrtc','custom_udp','unknown')),
  state text not null default 'initiated' check (state in ('initiated','ringing','connected','ended','failed')),
  started_at timestamptz not null default now(),
  connected_at timestamptz,
  ended_at timestamptz,
  failure_code text,
  constraint call_participant_present check (caller_device_id is not null or callee_device_id is not null)
);
create index if not exists call_sessions_started_idx on streetwise_core.call_sessions(started_at desc);
create table if not exists streetwise_core.operational_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  severity text not null default 'info' check (severity in ('info','warning','error')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists operational_events_created_idx on streetwise_core.operational_events(created_at desc);

-- Defense in depth: no direct client role access or permissive policies.
alter table streetwise_core.customers enable row level security;
alter table streetwise_core.service_plans enable row level security;
alter table streetwise_core.subscriptions enable row level security;
alter table streetwise_core.devices enable row level security;
alter table streetwise_core.esim_orders enable row level security;
alter table streetwise_core.call_sessions enable row level security;
alter table streetwise_core.operational_events enable row level security;
revoke all on all tables in schema streetwise_core from anon, authenticated;
revoke all on all sequences in schema streetwise_core from anon, authenticated;
