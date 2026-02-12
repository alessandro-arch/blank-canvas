
-- Fix: Change restrictive SELECT policies on reports to PERMISSIVE
-- The restrictive policies for admin/manager block scholars from seeing their own reports

-- Drop the restrictive policies
DROP POLICY IF EXISTS "Reports: select admin" ON public.reports;
DROP POLICY IF EXISTS "Reports: select manager org-scoped" ON public.reports;
DROP POLICY IF EXISTS "Reports: select own" ON public.reports;
DROP POLICY IF EXISTS "deny_anon_select" ON public.reports;

-- Recreate as PERMISSIVE policies (default)
CREATE POLICY "Reports: select own"
  ON public.reports FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Reports: select admin"
  ON public.reports FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Reports: select manager org-scoped"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'manager'::app_role) 
    AND EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = reports.user_id 
      AND p.organization_id IN (SELECT get_user_organizations())
    )
  );

-- Keep deny_anon_select as restrictive but only for anon role
CREATE POLICY "deny_anon_select"
  ON public.reports FOR SELECT
  TO anon
  USING (false);
