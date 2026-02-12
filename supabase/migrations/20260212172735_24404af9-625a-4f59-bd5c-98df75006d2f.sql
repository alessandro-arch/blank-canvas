-- Drop restrictive SELECT policies and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Roles: select own" ON public.user_roles;
DROP POLICY IF EXISTS "Roles: select admin" ON public.user_roles;
DROP POLICY IF EXISTS "Roles: select manager" ON public.user_roles;
DROP POLICY IF EXISTS "deny_anon_select" ON public.user_roles;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Roles: select own"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Roles: select admin"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Roles: select manager"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'manager'::app_role));

-- Block anon access (restrictive is fine here since it targets anon role only)
CREATE POLICY "deny_anon_select"
  ON public.user_roles
  FOR SELECT
  TO anon
  USING (false);