-- Deny anonymous SELECT on user_roles (restrictive policy)
CREATE POLICY "deny_anon_select"
ON public.user_roles
AS RESTRICTIVE
FOR SELECT
USING (auth.uid() IS NOT NULL);