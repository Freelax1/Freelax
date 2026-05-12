-- Record when a user accepted the Privacy Policy and Terms of Service at signup.
-- Required for HMRC production application compliance (UK GDPR / data controller obligations).
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
