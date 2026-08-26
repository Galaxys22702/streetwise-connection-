ALTER TABLE esim_orders
  ADD COLUMN IF NOT EXISTS esim_iccid TEXT;

UPDATE esim_orders
SET esim_iccid = install_json ->> 'iccid'
WHERE esim_iccid IS NULL
  AND install_json ? 'iccid';

CREATE UNIQUE INDEX IF NOT EXISTS esim_orders_provider_iccid_unique
  ON esim_orders (provider, esim_iccid)
  WHERE esim_iccid IS NOT NULL;

CREATE TABLE IF NOT EXISTS esim_provider_webhook_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  body_sha256 CHAR(64) NOT NULL,
  event_type TEXT NOT NULL,
  iccid TEXT,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, body_sha256)
);

CREATE INDEX IF NOT EXISTS esim_provider_webhook_events_iccid_idx
  ON esim_provider_webhook_events (provider, iccid, received_at DESC);
