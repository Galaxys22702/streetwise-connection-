CREATE TABLE IF NOT EXISTS meta_page_connections (
  page_id TEXT PRIMARY KEY CHECK (page_id ~ '^[0-9]+$'),
  page_name TEXT NOT NULL DEFAULT '',
  token_ciphertext TEXT NOT NULL,
  token_iv TEXT NOT NULL,
  token_tag TEXT NOT NULL,
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS meta_page_connections_updated_at_idx
  ON meta_page_connections (updated_at DESC);
