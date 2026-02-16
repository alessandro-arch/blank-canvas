
-- Drop restrictive policies on organization_invites and recreate as permissive
DROP POLICY IF EXISTS "org_invites_select_admin" ON public.organization_invites;
DROP POLICY IF EXISTS "org_invites_insert_admin" ON public.organization_invites;
DROP POLICY IF EXISTS "org_invites_update_admin" ON public.organization_invites;
DROP POLICY IF EXISTS "org_invites_delete_blocked" ON public.organization_invites;

CREATE POLICY "org_invites_select_admin" ON public.organization_invites
  FOR SELECT USING (is_org_admin(organization_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "org_invites_insert_admin" ON public.organization_invites
  FOR INSERT WITH CHECK (is_org_admin(organization_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "org_invites_update_admin" ON public.organization_invites
  FOR UPDATE USING (is_org_admin(organization_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "org_invites_delete_blocked" ON public.organization_invites
  FOR DELETE USING (false);
