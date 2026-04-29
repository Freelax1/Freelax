-- AI usage tracking. Each row is one successful Anthropic API call.
-- Used by lib/plan-limits.ts canUseAI() to enforce per-tier monthly quotas.

CREATE TABLE IF NOT EXISTS ai_calls (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  route       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_calls_user_month
  ON ai_calls (user_id, created_at DESC);

ALTER TABLE ai_calls ENABLE ROW LEVEL SECURITY;

-- Users can read their own AI call history (for usage display in UI).
-- Inserts only happen via service-role from API routes, so no INSERT policy
-- for authenticated users — RLS blocks them, only the server can write.
CREATE POLICY "Users view own ai calls" ON ai_calls
  FOR SELECT USING (auth.uid() = user_id);
