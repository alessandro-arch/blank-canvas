
-- Fix deny_anon_select to be restrictive for anon role
DROP POLICY IF EXISTS "deny_anon_select" ON public.reports;

CREATE POLICY "deny_anon_select"
  ON public.reports FOR SELECT
  TO anon
  USING (false);
