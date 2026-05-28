-- ============================================================
-- MTD Phase 1: Foundation Schema
-- Apply manually in Supabase SQL Editor AFTER preview deploy
-- is verified live.
-- ============================================================

-- 1. businesses table
--    Separates business identity from user identity.
--    Enables multi-business support in future MTD phases.
--    Each existing user gets one primary business record.
CREATE TABLE IF NOT EXISTS businesses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name   TEXT,
  business_type   TEXT DEFAULT 'sole_trader',
  utr_number      TEXT,
  vat_number      TEXT,
  vat_registered  BOOLEAN DEFAULT false,
  is_primary      BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON businesses(user_id);
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own businesses"
  ON businesses FOR ALL USING (auth.uid() = user_id);

-- 2. Populate businesses from existing users
--    One primary business record per user, copying existing fields.
INSERT INTO businesses (user_id, business_name, business_type, utr_number, vat_number, vat_registered, is_primary)
SELECT
  id,
  business_name,
  COALESCE(business_type, 'sole_trader'),
  utr_number,
  vat_number,
  COALESCE(vat_registered, false),
  true
FROM users
ON CONFLICT DO NOTHING;

-- 3. oauth_connections table
--    Stores HMRC OAuth tokens per user.
--    Populated when user connects HMRC account (future phase).
CREATE TABLE IF NOT EXISTS oauth_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider        TEXT NOT NULL DEFAULT 'hmrc',
  access_token    TEXT,
  refresh_token   TEXT,
  token_expiry    TIMESTAMPTZ,
  hmrc_account_id TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_oauth_connections_user_id ON oauth_connections(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_connections_user_provider
  ON oauth_connections(user_id, provider);
ALTER TABLE oauth_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own oauth connections"
  ON oauth_connections FOR ALL USING (auth.uid() = user_id);

-- 4. submission_periods table
--    Tracks each MTD quarterly submission per business.
--    Populated when MTD submission logic is built (future phase).
CREATE TABLE IF NOT EXISTS submission_periods (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  period_start        DATE NOT NULL,
  period_end          DATE NOT NULL,
  period_type         TEXT NOT NULL CHECK (period_type IN ('itsa_quarterly', 'vat_return', 'itsa_final')),
  status              TEXT NOT NULL DEFAULT 'not_started'
                      CHECK (status IN ('not_started', 'draft', 'submitted', 'accepted', 'amendment_required')),
  hmrc_submission_id  TEXT,
  submitted_at        TIMESTAMPTZ,
  income_total        NUMERIC(10,2),
  expenses_total      NUMERIC(10,2),
  profit_total        NUMERIC(10,2),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_submission_periods_business
  ON submission_periods(business_id, period_start);
ALTER TABLE submission_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own submission periods"
  ON submission_periods FOR ALL
  USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = submission_periods.business_id
    AND businesses.user_id = auth.uid()
  ));

-- 5. Add business_id to existing tables
--    Nullable for now — existing rows will be backfilled below.
--    Will become NOT NULL in a future migration once all rows are populated.
ALTER TABLE invoices       ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE SET NULL;
ALTER TABLE expenses       ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE SET NULL;
ALTER TABLE clients        ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE SET NULL;
ALTER TABLE projects       ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE SET NULL;
ALTER TABLE mileage_entries ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE SET NULL;
ALTER TABLE tax_pot_entries ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_business_id        ON invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_expenses_business_id        ON expenses(business_id);
CREATE INDEX IF NOT EXISTS idx_clients_business_id         ON clients(business_id);
CREATE INDEX IF NOT EXISTS idx_projects_business_id        ON projects(business_id);
CREATE INDEX IF NOT EXISTS idx_mileage_entries_business_id ON mileage_entries(business_id);
CREATE INDEX IF NOT EXISTS idx_tax_pot_entries_business_id ON tax_pot_entries(business_id);

-- 6. Backfill business_id on all existing rows
--    Matches each row to the user's primary business record.
UPDATE invoices i
SET business_id = b.id
FROM businesses b
WHERE b.user_id = i.user_id AND b.is_primary = true;

UPDATE expenses e
SET business_id = b.id
FROM businesses b
WHERE b.user_id = e.user_id AND b.is_primary = true;

UPDATE clients c
SET business_id = b.id
FROM businesses b
WHERE b.user_id = c.user_id AND b.is_primary = true;

UPDATE projects p
SET business_id = b.id
FROM businesses b
WHERE b.user_id = p.user_id AND b.is_primary = true;

UPDATE mileage_entries m
SET business_id = b.id
FROM businesses b
WHERE b.user_id = m.user_id AND b.is_primary = true;

UPDATE tax_pot_entries t
SET business_id = b.id
FROM businesses b
WHERE b.user_id = t.user_id AND b.is_primary = true;

-- 7. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
