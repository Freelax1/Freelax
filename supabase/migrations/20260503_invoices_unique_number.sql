-- C1: Atomic invoice number generation via FOR UPDATE locking.
-- The recurring route calls this via supabase.rpc() so the SELECT and the
-- caller's INSERT run inside the same transaction, serialising concurrent
-- executions for the same user.
--
-- Edge case: if no invoices exist yet for the user, there is no row to lock.
-- The unique index below (S1) acts as the safety net for that case.

CREATE OR REPLACE FUNCTION next_invoice_number(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_number text;
  v_max_num        integer;
BEGIN
  SELECT invoice_number
  INTO   v_invoice_number
  FROM   invoices
  WHERE  user_id = p_user_id
  ORDER  BY created_at DESC
  LIMIT  1
  FOR UPDATE;

  v_max_num := COALESCE(
    NULLIF(regexp_replace(COALESCE(v_invoice_number, ''), '[^0-9]', '', 'g'), '')::integer,
    0
  );

  RETURN 'INV-' || lpad((v_max_num + 1)::text, 4, '0');
END;
$$;

-- S1: Unique index so the DB rejects duplicate invoice numbers even if the
-- application-level lock is bypassed (e.g. first invoice for a new user, or
-- a manual insert via the Supabase dashboard).
-- Apply this manually in the Supabase SQL editor after verifying the deploy.
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_user_number
  ON invoices(user_id, invoice_number);
