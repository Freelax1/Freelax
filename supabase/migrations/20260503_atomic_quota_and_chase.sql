-- ── C3: Atomic quota enforcement ─────────────────────────────────────────────
--
-- The canCreate* preflight functions in lib/plan-limits.ts are advisory UI
-- hints called before client-side Supabase inserts. Because the check and the
-- insert are separate requests, they have a TOCTOU race window.
--
-- Fix: BEFORE INSERT triggers (with per-user advisory locks) run inside every
-- INSERT transaction regardless of origin, providing true atomic enforcement
-- even for direct Supabase client calls.
--
-- IMPORTANT: The plan limits here must stay in sync with PLAN_LIMITS in
-- lib/plan-limits.ts. If you change a tier's limit in TypeScript, update the
-- corresponding CASE branch below too.

CREATE OR REPLACE FUNCTION enforce_invoice_monthly_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_plan  text;
  v_limit integer;
  v_count integer;
BEGIN
  -- Serialise concurrent inserts for the same user so two requests that both
  -- just-barely fit under the limit can't both sneak through simultaneously.
  PERFORM pg_advisory_xact_lock(hashtext('inv_quota:' || NEW.user_id::text));

  SELECT COALESCE(subscription_plan, 'free')
  INTO   v_plan
  FROM   users
  WHERE  id = NEW.user_id;

  v_limit := CASE v_plan
    WHEN 'pro'    THEN -1   -- unlimited
    WHEN 'studio' THEN -1   -- unlimited
    WHEN 'solo'   THEN -1   -- unlimited
    ELSE                3   -- free
  END;

  IF v_limit = -1 THEN RETURN NEW; END IF;

  SELECT count(*)
  INTO   v_count
  FROM   invoices
  WHERE  user_id    = NEW.user_id
    AND  created_at >= date_trunc('month', now());

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'invoice_quota_exceeded: % plan allows % invoices per month',
      v_plan, v_limit;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_client_total_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_plan  text;
  v_limit integer;
  v_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('cli_quota:' || NEW.user_id::text));

  SELECT COALESCE(subscription_plan, 'free')
  INTO   v_plan
  FROM   users
  WHERE  id = NEW.user_id;

  v_limit := CASE v_plan
    WHEN 'pro'    THEN -1
    WHEN 'studio' THEN -1
    WHEN 'solo'   THEN  5
    ELSE                1   -- free
  END;

  IF v_limit = -1 THEN RETURN NEW; END IF;

  SELECT count(*)
  INTO   v_count
  FROM   clients
  WHERE  user_id = NEW.user_id
    AND  status  = 'active';

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'client_quota_exceeded: % plan allows % active clients',
      v_plan, v_limit;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_expense_monthly_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_plan  text;
  v_limit integer;
  v_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('exp_quota:' || NEW.user_id::text));

  SELECT COALESCE(subscription_plan, 'free')
  INTO   v_plan
  FROM   users
  WHERE  id = NEW.user_id;

  v_limit := CASE v_plan
    WHEN 'pro'    THEN -1
    WHEN 'studio' THEN -1
    WHEN 'solo'   THEN -1   -- unlimited
    ELSE               10   -- free
  END;

  IF v_limit = -1 THEN RETURN NEW; END IF;

  SELECT count(*)
  INTO   v_count
  FROM   expenses
  WHERE  user_id    = NEW.user_id
    AND  created_at >= date_trunc('month', now());

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'expense_quota_exceeded: % plan allows % expenses per month',
      v_plan, v_limit;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_invoices_monthly_limit
  BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION enforce_invoice_monthly_limit();

CREATE OR REPLACE TRIGGER trg_clients_total_limit
  BEFORE INSERT ON clients
  FOR EACH ROW EXECUTE FUNCTION enforce_client_total_limit();

CREATE OR REPLACE TRIGGER trg_expenses_monthly_limit
  BEFORE INSERT ON expenses
  FOR EACH ROW EXECUTE FUNCTION enforce_expense_monthly_limit();

CREATE OR REPLACE FUNCTION enforce_quote_monthly_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_plan  text;
  v_limit integer;
  v_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('quo_quota:' || NEW.user_id::text));

  SELECT COALESCE(subscription_plan, 'free')
  INTO   v_plan
  FROM   users
  WHERE  id = NEW.user_id;

  v_limit := CASE v_plan
    WHEN 'pro'    THEN -1   -- unlimited
    WHEN 'studio' THEN -1   -- unlimited
    WHEN 'solo'   THEN -1   -- unlimited
    ELSE                1   -- free
  END;

  IF v_limit = -1 THEN RETURN NEW; END IF;

  SELECT count(*)
  INTO   v_count
  FROM   quotes
  WHERE  user_id    = NEW.user_id
    AND  created_at >= date_trunc('month', now());

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'quote_quota_exceeded: % plan allows % quotes per month',
      v_plan, v_limit;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_quotes_monthly_limit
  BEFORE INSERT ON quotes
  FOR EACH ROW EXECUTE FUNCTION enforce_quote_monthly_limit();


-- ── H2: Atomic invoice chase cooldown ────────────────────────────────────────
--
-- The chase route previously read chase_log then updated in two steps,
-- creating a window where two concurrent requests could both pass the cooldown
-- check and both append entries.
--
-- Fix: a single UPDATE … WHERE cooldown_ok RETURNING id. If no rows are
-- returned, the cooldown is still active (or a concurrent request won). The
-- route returns 429 in that case.

CREATE OR REPLACE FUNCTION apply_invoice_chase(
  p_invoice_id uuid,
  p_user_id    uuid,
  p_entry      jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_id uuid;
BEGIN
  UPDATE invoices
  SET
    chase_log  = COALESCE(chase_log, '[]'::jsonb) || p_entry,
    updated_at = now()
  WHERE id      = p_invoice_id
    AND user_id = p_user_id
    AND (
      COALESCE(jsonb_array_length(chase_log), 0) = 0
      OR (chase_log->-1->>'chased_at')::timestamptz < now() - INTERVAL '7 days'
    )
  RETURNING id INTO v_id;

  RETURN v_id;  -- NULL means cooldown still active or concurrent request won
END;
$$;
