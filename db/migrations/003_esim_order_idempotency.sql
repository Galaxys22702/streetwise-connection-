ALTER TABLE esim_orders
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS esim_orders_user_idempotency_key_unique
  ON esim_orders (user_id, idempotency_key)
  WHERE user_id IS NOT NULL AND idempotency_key IS NOT NULL;
