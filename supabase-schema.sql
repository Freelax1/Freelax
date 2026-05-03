-- ============================================
-- Freedesk — Supabase Schema
-- Run this in your Supabase SQL editor
-- ============================================

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  business_name TEXT,
  business_type TEXT DEFAULT 'sole_trader',
  vat_registered BOOLEAN DEFAULT false,
  vat_number TEXT,
  vat_scheme TEXT DEFAULT 'standard',
  utr_number TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  postcode TEXT,
  phone TEXT,
  logo_url TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_plan TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'active',

  -- Banking
  bank_account_name TEXT,
  bank_sort_code TEXT,
  bank_account_number TEXT,
  bank_reference_note TEXT,

  -- Invoice defaults
  invoice_prefix TEXT,
  invoice_default_notes TEXT,
  invoice_email_subject TEXT,
  invoice_email_body TEXT,
  target_take_home DECIMAL(10,2),

  -- Quote defaults
  quote_prefix TEXT,
  quote_validity_days INTEGER,
  quote_default_notes TEXT,
  quote_email_subject TEXT,
  quote_email_body TEXT,

  -- Chase email templates
  chase_email_subject_1 TEXT,
  chase_email_body_1 TEXT,
  chase_email_subject_2 TEXT,
  chase_email_body_2 TEXT,
  chase_email_subject_3 TEXT,
  chase_email_body_3 TEXT,

  -- Tax profile
  student_loan_plan TEXT,
  pension_contributions DECIMAL(10,2),
  salary_drawn DECIMAL(10,2),
  dividends_drawn DECIMAL(10,2),
  other_income DECIMAL(10,2),
  investment_dividends DECIMAL(10,2),
  monthly_expenses_estimate DECIMAL(10,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  postcode TEXT,
  country TEXT DEFAULT 'United Kingdom',
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  rate_type TEXT,
  rate_amount DECIMAL(10,2),
  start_date DATE,
  end_date DATE,
  ir35_status TEXT DEFAULT 'needs_review',
  ir35_answers JSONB,
  ir35_assessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  payment_terms TEXT DEFAULT 'Payment due within 30 days',
  stripe_payment_link TEXT,
  sent_at TIMESTAMPTZ,
  chase_log JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  vat_rate DECIMAL(5,2) DEFAULT 20.00,
  line_total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  merchant TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  vat_amount DECIMAL(10,2) DEFAULT 0,
  vat_reclaimable BOOLEAN DEFAULT false,
  receipt_url TEXT,
  ai_scanned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ir35_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  answers JSONB NOT NULL,
  status TEXT NOT NULL,
  ai_explanation TEXT,
  ai_risk_factors JSONB,
  ai_recommendations JSONB,
  assessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ir35_assessments ENABLE ROW LEVEL SECURITY;

-- Users: can only read/update own row
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Clients
CREATE POLICY "Users manage own clients" ON clients FOR ALL USING (auth.uid() = user_id);

-- Projects
CREATE POLICY "Users manage own projects" ON projects FOR ALL USING (auth.uid() = user_id);

-- Invoices
CREATE POLICY "Users manage own invoices" ON invoices FOR ALL USING (auth.uid() = user_id);

-- Invoice line items (via invoice ownership)
CREATE POLICY "Users manage own line items" ON invoice_line_items FOR ALL
  USING (EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_line_items.invoice_id AND invoices.user_id = auth.uid()));

-- Expenses
CREATE POLICY "Users manage own expenses" ON expenses FOR ALL USING (auth.uid() = user_id);

-- IR35 assessments
CREATE POLICY "Users manage own assessments" ON ir35_assessments FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- Auto-create user profile on signup
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Supabase Storage bucket for receipts
-- ============================================
-- Run this separately in Supabase dashboard > Storage
-- or via the API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);

-- ============================================
-- Indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_paid_date ON invoices(paid_date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);

-- Task 15: Tax pot entries
CREATE TABLE IF NOT EXISTS tax_pot_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount          NUMERIC(10,2) NOT NULL,
  note            TEXT,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  tax_year_start  INT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS tax_pot_entries_user_idx ON tax_pot_entries(user_id, tax_year_start);

-- Task 21: Recurring invoice templates
CREATE TABLE IF NOT EXISTS invoice_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES clients(id),
  frequency       TEXT NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'quarterly')),
  next_run_date   DATE NOT NULL,
  line_items      JSONB NOT NULL DEFAULT '[]',
  payment_terms   TEXT DEFAULT 'Payment due within 30 days',
  notes           TEXT,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS invoice_templates_user_idx ON invoice_templates(user_id, active);
CREATE INDEX IF NOT EXISTS invoice_templates_run_idx ON invoice_templates(next_run_date) WHERE active = TRUE;

-- ── Next Wave: public invoice tokens ────────────────────────────────────
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS public_token TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_invoices_public_token ON invoices(public_token);

-- ── Next Wave: mileage tracking ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mileage_entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date           DATE NOT NULL DEFAULT CURRENT_DATE,
  description    TEXT NOT NULL,
  from_location  TEXT,
  to_location    TEXT,
  miles          DECIMAL(8,1) NOT NULL,
  purpose        TEXT DEFAULT 'business',
  tax_year_start INT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mileage_user ON mileage_entries(user_id, tax_year_start);
ALTER TABLE mileage_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own mileage" ON mileage_entries FOR ALL USING (auth.uid() = user_id);

-- ── Next Wave: accountant invites ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accountant_invites (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  token        TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  accepted_at  TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_accountant_invites_owner ON accountant_invites(owner_id);
CREATE INDEX IF NOT EXISTS idx_accountant_invites_token ON accountant_invites(token);
ALTER TABLE accountant_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage own invites" ON accountant_invites FOR ALL USING (auth.uid() = owner_id);

-- v6: monthly personal outgoings for Safe to Spend
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_personal_outgoings DECIMAL(10,2);

-- ============================================================
-- Schema Consolidation (added April 2026)
-- All tables below were missing from the original schema file
-- ============================================================

-- invoice_activity
CREATE TABLE IF NOT EXISTS invoice_activity (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoice_activity_invoice ON invoice_activity(invoice_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_activity_user ON invoice_activity(user_id);
ALTER TABLE invoice_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own invoice activity" ON invoice_activity FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own invoice activity" ON invoice_activity FOR INSERT WITH CHECK (auth.uid() = user_id);

-- quotes
CREATE TABLE IF NOT EXISTS quotes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id            UUID REFERENCES clients(id) ON DELETE SET NULL,
  project_id           UUID REFERENCES projects(id) ON DELETE SET NULL,
  quote_number         TEXT NOT NULL,
  status               TEXT DEFAULT 'draft',
  issue_date           DATE NOT NULL,
  expiry_date          DATE,
  subtotal             DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat_amount           DECIMAL(10,2) NOT NULL DEFAULT 0,
  total                DECIMAL(10,2) NOT NULL DEFAULT 0,
  notes                TEXT,
  public_token         TEXT UNIQUE,
  accepted_at          TIMESTAMPTZ,
  declined_at          TIMESTAMPTZ,
  sent_at              TIMESTAMPTZ,
  converted_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_public_token ON quotes(public_token);
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own quotes" ON quotes FOR ALL USING (auth.uid() = user_id);

-- quote_line_items
CREATE TABLE IF NOT EXISTS quote_line_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id    UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity    DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price  DECIMAL(10,2) NOT NULL,
  vat_rate    DECIMAL(5,2) DEFAULT 20.00,
  line_total  DECIMAL(10,2) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quote_line_items_quote_id ON quote_line_items(quote_id);
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own quote line items" ON quote_line_items FOR ALL
  USING (EXISTS (SELECT 1 FROM quotes WHERE quotes.id = quote_line_items.quote_id AND quotes.user_id = auth.uid()));

-- quote_activity
CREATE TABLE IF NOT EXISTS quote_activity (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id    UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quote_activity_quote ON quote_activity(quote_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_activity_user  ON quote_activity(user_id);
ALTER TABLE quote_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own quote activity"   ON quote_activity FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own quote activity" ON quote_activity FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS on tax_pot_entries and invoice_templates
ALTER TABLE tax_pot_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tax pot entries" ON tax_pot_entries FOR ALL USING (auth.uid() = user_id);
ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own invoice templates" ON invoice_templates FOR ALL USING (auth.uid() = user_id);

-- ai_calls: tracks successful Anthropic API calls for per-tier quota enforcement
CREATE TABLE IF NOT EXISTS ai_calls (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  route       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_calls_user_month ON ai_calls (user_id, created_at DESC);
ALTER TABLE ai_calls ENABLE ROW LEVEL SECURITY;
-- Users can read their own call history. Inserts go through service-role only.
CREATE POLICY "Users view own ai calls" ON ai_calls
  FOR SELECT USING (auth.uid() = user_id);
