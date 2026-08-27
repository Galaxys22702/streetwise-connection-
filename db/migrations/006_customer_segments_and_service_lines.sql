CREATE TABLE IF NOT EXISTS customer_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  customer_type TEXT NOT NULL CHECK (customer_type IN ('residential', 'commercial')),
  display_name TEXT,
  phone TEXT,
  billing_country TEXT NOT NULL DEFAULT 'US',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organisations (
  id TEXT PRIMARY KEY,
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  billing_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organisation_members (
  organisation_id TEXT NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organisation_id, user_id)
);

CREATE INDEX IF NOT EXISTS organisation_members_user_id_idx
  ON organisation_members(user_id);

CREATE TABLE IF NOT EXISTS service_lines (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  organisation_id TEXT REFERENCES organisations(id) ON DELETE CASCADE,
  subscription_id TEXT REFERENCES subscriptions(id) ON DELETE SET NULL,
  plan_id TEXT NOT NULL,
  audience TEXT NOT NULL CHECK (audience IN ('residential', 'commercial')),
  provider TEXT,
  provider_line_id TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (audience = 'residential' AND user_id IS NOT NULL AND organisation_id IS NULL)
    OR
    (audience = 'commercial' AND organisation_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS service_lines_provider_line_unique
  ON service_lines(provider, provider_line_id)
  WHERE provider IS NOT NULL AND provider_line_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS service_lines_user_id_idx ON service_lines(user_id);
CREATE INDEX IF NOT EXISTS service_lines_organisation_id_idx ON service_lines(organisation_id);
CREATE INDEX IF NOT EXISTS service_lines_subscription_id_idx ON service_lines(subscription_id);

CREATE TABLE IF NOT EXISTS plan_snapshots (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  audience TEXT NOT NULL CHECK (audience IN ('residential', 'commercial')),
  price_usd NUMERIC(10,2) NOT NULL CHECK (price_usd > 0),
  billing_period TEXT NOT NULL DEFAULT 'month',
  minimum_lines INTEGER CHECK (minimum_lines IS NULL OR minimum_lines > 0),
  hotspot_included BOOLEAN NOT NULL DEFAULT FALSE,
  provider TEXT,
  provider_bundle TEXT,
  commercial_status TEXT NOT NULL DEFAULT 'planned',
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS plan_snapshots_plan_id_idx ON plan_snapshots(plan_id);
CREATE INDEX IF NOT EXISTS plan_snapshots_captured_at_idx ON plan_snapshots(captured_at DESC);
