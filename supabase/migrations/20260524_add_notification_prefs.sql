-- Email notification preferences (Settings → Notifications)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS notify_invoices_overdue boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_vat_threshold boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_sa_deadline boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_tax_year_end boolean NOT NULL DEFAULT true;
