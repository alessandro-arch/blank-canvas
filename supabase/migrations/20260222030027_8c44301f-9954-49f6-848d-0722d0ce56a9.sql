
-- =============================================
-- FIX 1: login_attempts — block all direct access
-- Only SECURITY DEFINER RPCs (record_login_attempt, check_login_lockout) should touch this table
-- =============================================

-- Drop any existing policies first (safe if none exist)
DO $$ BEGIN
  DROP POLICY IF EXISTS "login_attempts_no_select" ON public.login_attempts;
  DROP POLICY IF EXISTS "login_attempts_no_insert" ON public.login_attempts;
  DROP POLICY IF EXISTS "login_attempts_no_update" ON public.login_attempts;
  DROP POLICY IF EXISTS "login_attempts_no_delete" ON public.login_attempts;
END $$;

CREATE POLICY "login_attempts_no_select"
  ON public.login_attempts FOR SELECT
  TO authenticated, anon
  USING (false);

CREATE POLICY "login_attempts_no_insert"
  ON public.login_attempts FOR INSERT
  TO authenticated, anon
  WITH CHECK (false);

CREATE POLICY "login_attempts_no_update"
  ON public.login_attempts FOR UPDATE
  TO authenticated, anon
  USING (false);

CREATE POLICY "login_attempts_no_delete"
  ON public.login_attempts FOR DELETE
  TO authenticated, anon
  USING (false);

-- =============================================
-- FIX 2: bank_accounts_public VIEW
-- This is a VIEW with security_invoker=true, so it inherits
-- RLS from bank_accounts. But if the view itself is queryable
-- without RLS, we need to ensure bank_accounts base table
-- policies are correct. Let's also add explicit deny for anon.
-- =============================================

-- Ensure anon cannot read bank_accounts at all
DO $$ BEGIN
  DROP POLICY IF EXISTS "bank_accounts_deny_anon" ON public.bank_accounts;
END $$;

CREATE POLICY "bank_accounts_deny_anon"
  ON public.bank_accounts FOR SELECT
  TO anon
  USING (false);
