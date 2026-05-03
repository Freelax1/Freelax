-- The "Public can view invoices by token" policy allowed any anon client to
-- SELECT every invoice with public_token set, not just an invoice matching a
-- supplied token. Public invoice viewing now goes through /inv/[token]
-- as a server component using the service-role client, which validates
-- the token explicitly. The broad anon policy is no longer needed.

DROP POLICY IF EXISTS "Public can view invoices by token" ON invoices;
