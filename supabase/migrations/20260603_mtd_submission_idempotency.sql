-- 20260603_mtd_submission_idempotency.sql
-- Idempotency support for MTD submission routes.
--
-- (a) Adds 'pending' to the allowed status values so a row can be pre-inserted
--     before the HMRC call. On HMRC success we update to 'submitted'; on HMRC
--     failure we revert to 'draft' (or delete) so the user can retry.
-- (b) Adds a UNIQUE constraint on (business_id, period_start, period_end,
--     period_type) so a concurrent double-submit hits a 23505 duplicate-key
--     violation that the route handler can branch on.

ALTER TABLE submission_periods DROP CONSTRAINT IF EXISTS submission_periods_status_check;
ALTER TABLE submission_periods ADD CONSTRAINT submission_periods_status_check
  CHECK (status IN ('not_started', 'draft', 'pending', 'submitted', 'accepted', 'amendment_required'));

ALTER TABLE submission_periods
  DROP CONSTRAINT IF EXISTS submission_periods_unique_period;
ALTER TABLE submission_periods
  ADD CONSTRAINT submission_periods_unique_period
  UNIQUE (business_id, period_start, period_end, period_type);
