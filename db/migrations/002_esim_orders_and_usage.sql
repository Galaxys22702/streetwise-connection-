CREATE TABLE IF NOT EXISTS esim_orders (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  provider_order_reference TEXT,
  bundle_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  country TEXT,
  device TEXT,
  customer_email TEXT,
  requested_mode TEXT NOT NULL,
  status TEXT NOT NULL,
  total NUMERIC(12,2),
  currency TEXT,
  provider_mode TEXT,
  live_order_executed BOOLEAN NOT NULL DEFAULT FALSE,
  install_json JSONB,
  error TEXT,
  data_limit_bytes BIGINT,
  data_used_bytes BIGINT NOT NULL DEFAULT 0,
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS esim_orders_user_id_idx ON esim_orders(user_id);
CREATE INDEX IF NOT EXISTS esim_orders_status_idx ON esim_orders(status);
CREATE UNIQUE INDEX IF NOT EXISTS esim_orders_provider_reference_unique
  ON esim_orders(provider, provider_order_reference)
  WHERE provider_order_reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS esim_usage_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES esim_orders(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  used_bytes BIGINT NOT NULL CHECK (used_bytes >= 0),
  remaining_bytes BIGINT,
  raw_json JSONB,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS esim_usage_events_order_recorded_idx
  ON esim_usage_events(order_id, recorded_at DESC);
