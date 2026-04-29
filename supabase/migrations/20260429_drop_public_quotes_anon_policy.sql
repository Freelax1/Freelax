-- The "Public can view quotes by token" policy allowed any anon client to
-- SELECT every quote with public_token set, not just a quote matching a
-- supplied token. Public quote viewing now goes through
-- /api/quotes/public/[token] using the service-role client, which validates
-- the token explicitly. The broad anon policy is no longer needed.

DROP POLICY IF EXISTS "Public can view quotes by token" ON quotes;
