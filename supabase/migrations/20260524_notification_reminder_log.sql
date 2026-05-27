-- Dedupe daily notification reminder emails (cron)
CREATE TABLE IF NOT EXISTS notification_reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reminder_type text NOT NULL,
  sent_on date NOT NULL DEFAULT (CURRENT_DATE),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, reminder_type, sent_on)
);

CREATE INDEX IF NOT EXISTS notification_reminder_log_user_idx
  ON notification_reminder_log (user_id);

ALTER TABLE notification_reminder_log ENABLE ROW LEVEL SECURITY;
