CREATE TABLE IF NOT EXISTS business_compliance_records (
  id TEXT PRIMARY KEY,
  record_type TEXT NOT NULL CHECK (record_type IN (
    'nevada_entity',
    'state_business_license',
    'ein_status',
    'nevada_tax_registration',
    'local_business_license',
    'home_occupation',
    'pucn',
    'fcc_frn',
    'fcc_form_499',
    'usac',
    'other'
  )),
  jurisdiction TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'submitted',
    'approved',
    'not_required',
    'expired',
    'rejected'
  )),
  public_reference TEXT,
  effective_date DATE,
  renewal_date DATE,
  notes TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS business_compliance_records_type_idx
  ON business_compliance_records(record_type);
CREATE INDEX IF NOT EXISTS business_compliance_records_status_idx
  ON business_compliance_records(status);
CREATE INDEX IF NOT EXISTS business_compliance_records_renewal_idx
  ON business_compliance_records(renewal_date)
  WHERE renewal_date IS NOT NULL;

CREATE TABLE IF NOT EXISTS provider_commercial_approvals (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  contractual_role TEXT,
  provider_of_record TEXT,
  recurring_us_domestic_use BOOLEAN,
  residential_resale BOOLEAN,
  commercial_resale BOOLEAN,
  hotspot_permitted BOOLEAN,
  taxes_responsibility TEXT,
  refunds_responsibility TEXT,
  support_responsibility TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'under_review',
    'approved',
    'rejected',
    'expired'
  )),
  evidence_reference TEXT,
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS provider_commercial_approvals_provider_idx
  ON provider_commercial_approvals(provider);
CREATE INDEX IF NOT EXISTS provider_commercial_approvals_status_idx
  ON provider_commercial_approvals(status);

CREATE TABLE IF NOT EXISTS launch_plan_approvals (
  plan_id TEXT PRIMARY KEY,
  provider TEXT,
  provider_bundle TEXT,
  retail_price_usd NUMERIC(10,2) NOT NULL CHECK (retail_price_usd > 0),
  audience TEXT NOT NULL CHECK (audience IN ('residential', 'commercial')),
  data_allowance_text TEXT,
  hotspot_terms_text TEXT,
  throttling_terms_text TEXT,
  contribution_margin_percent NUMERIC(7,3),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN (
    'planned',
    'economics_review',
    'provider_review',
    'approved',
    'retired'
  )),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS launch_plan_approvals_status_idx
  ON launch_plan_approvals(status);
