-- ============================================================
-- Schema Drift Consolidation — May 2026
-- Apply manually in Supabase SQL Editor AFTER preview deploy
-- is verified live. Do not apply before the deploy lands.
-- ============================================================

-- 1. Create quote_activity
--    This table is defined in supabase-schema.sql and written to by
--    lib/api/quote-activity.ts, but was never created in the live DB
--    due to a forward-reference ordering bug (quote_activity referenced
--    quotes before quotes was defined in the schema file). Quote activity
--    logging has been silently failing since deployment.
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
CREATE POLICY "Users view own quote activity"
  ON quote_activity FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own quote activity"
  ON quote_activity FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 2. Drop vestigial invoices columns
--    chase_count and last_chased_at are from a pre-chase_log implementation.
--    Nothing in the codebase reads or writes them. chase_log JSONB is the
--    current approach and is already in production.
ALTER TABLE invoices DROP COLUMN IF EXISTS chase_count;
ALTER TABLE invoices DROP COLUMN IF EXISTS last_chased_at;

-- 3. Drop old bank column names on users
--    These were renamed to bank_account_name / bank_sort_code /
--    bank_account_number / bank_reference_note. The old names are dead.
ALTER TABLE users DROP COLUMN IF EXISTS bank_name;
ALTER TABLE users DROP COLUMN IF EXISTS account_number;
ALTER TABLE users DROP COLUMN IF EXISTS sort_code;
ALTER TABLE users DROP COLUMN IF EXISTS bank_reference;

-- 4. Drop duplicate quote validity column
--    quote_validity_days is the name used by the code.
--    quote_default_validity_days is an unused duplicate.
ALTER TABLE users DROP COLUMN IF EXISTS quote_default_validity_days;

-- Reload PostgREST schema cache so the API sees the changes immediately
NOTIFY pgrst, 'reload schema';
