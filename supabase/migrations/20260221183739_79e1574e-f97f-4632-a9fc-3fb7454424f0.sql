-- Fix grant_terms: scope manager access by organization (via profiles JOIN)

-- Drop existing unscoped manager policies
DROP POLICY IF EXISTS "grant_terms_select_manager" ON public.grant_terms;
DROP POLICY IF EXISTS "grant_terms_insert_manager" ON public.grant_terms;
DROP POLICY IF EXISTS "grant_terms_update_manager" ON public.grant_terms;

-- Recreate with org-scoping (same pattern as reports table)
CREATE POLICY "grant_terms_select_manager_org_scoped" ON public.grant_terms
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'manager'::app_role)
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = grant_terms.user_id
          AND p.organization_id IN (SELECT get_user_organizations())
      )
    )
  );

CREATE POLICY "grant_terms_insert_manager_org_scoped" ON public.grant_terms
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'manager'::app_role)
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = grant_terms.user_id
          AND p.organization_id IN (SELECT get_user_organizations())
      )
    )
  );

CREATE POLICY "grant_terms_update_manager_org_scoped" ON public.grant_terms
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'manager'::app_role)
      AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.user_id = grant_terms.user_id
          AND p.organization_id IN (SELECT get_user_organizations())
      )
    )
  );