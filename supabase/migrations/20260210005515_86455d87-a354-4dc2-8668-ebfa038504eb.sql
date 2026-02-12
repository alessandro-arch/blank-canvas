
-- Fix 1: Reports - scope manager SELECT access by organization
DROP POLICY "Reports: select manager/admin" ON public.reports;

CREATE POLICY "Reports: select admin"
ON public.reports
AS RESTRICTIVE
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Reports: select manager org-scoped"
ON public.reports
AS RESTRICTIVE
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'manager'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = reports.user_id
    AND p.organization_id IN (SELECT get_user_organizations())
  )
);

-- Fix 1b: Reports - scope manager UPDATE access by organization
DROP POLICY "Reports: update manager/admin" ON public.reports;

CREATE POLICY "Reports: update admin"
ON public.reports
AS RESTRICTIVE
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Reports: update manager org-scoped"
ON public.reports
AS RESTRICTIVE
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'manager'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = reports.user_id
    AND p.organization_id IN (SELECT get_user_organizations())
  )
);

-- Fix 2: Add deny_anon_select on bank_accounts for defense-in-depth
CREATE POLICY "deny_anon_select"
ON public.bank_accounts
AS RESTRICTIVE
FOR SELECT TO anon
USING (false);

-- Fix 3: Add deny_anon_select on reports for defense-in-depth
CREATE POLICY "deny_anon_select"
ON public.reports
AS RESTRICTIVE
FOR SELECT TO anon
USING (false);
