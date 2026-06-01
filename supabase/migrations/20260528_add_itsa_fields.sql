-- ============================================================
-- MTD for Income Tax (ITSA) — NINO + HMRC business ID
-- Apply manually in Supabase SQL Editor after preview is live.
-- ============================================================

-- NINO required for all HMRC MTD IT API calls
ALTER TABLE users ADD COLUMN IF NOT EXISTS nino TEXT;

-- HMRC business ID fetched from HMRC API using NINO
-- Stored so we don't need to re-fetch on every call
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS hmrc_business_id TEXT;

NOTIFY pgrst, 'reload schema';
