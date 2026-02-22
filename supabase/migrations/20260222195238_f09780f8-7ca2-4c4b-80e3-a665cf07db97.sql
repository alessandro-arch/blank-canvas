
-- RLS policy: auditors can SELECT grant_terms for scholars in their org
CREATE POLICY "grant_terms_select_auditor_org_scoped"
  ON public.grant_terms FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'auditor'::app_role)
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = grant_terms.user_id
      AND p.organization_id IN (SELECT get_user_organizations())
    )
  );

-- RLS policy: auditors can SELECT work_plans in their org
CREATE POLICY "work_plans_select_auditor_org"
  ON public.work_plans FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'auditor'::app_role)
    AND organization_id IN (SELECT get_user_organizations())
  );
