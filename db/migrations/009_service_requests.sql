CREATE TABLE IF NOT EXISTS service_requests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  email TEXT NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),
  phone TEXT CHECK (phone IS NULL OR char_length(phone) <= 40),
  customer_type TEXT NOT NULL CHECK (customer_type IN ('residential', 'commercial')),
  division TEXT NOT NULL CHECK (division IN ('connect', 'support', 'secure', 'business')),
  service_slug TEXT NOT NULL CHECK (service_slug ~ '^[a-z0-9-]{2,80}$'),
  delivery_preference TEXT NOT NULL CHECK (delivery_preference IN ('remote', 'on-site', 'no-preference')),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 10 AND 4000),
  preferred_contact_time TEXT CHECK (preferred_contact_time IS NULL OR char_length(preferred_contact_time) <= 120),
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'under_review', 'contacted', 'quoted', 'scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS service_requests_status_idx
  ON service_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS service_requests_email_idx
  ON service_requests(lower(email));

ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

-- Service requests are written and read by the application server.
-- No public Data API policy is granted.
