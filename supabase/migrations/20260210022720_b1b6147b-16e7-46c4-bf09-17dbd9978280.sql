-- Drop the incorrectly created PERMISSIVE deny_anon_select policy
DROP POLICY IF EXISTS "deny_anon_select" ON public.user_roles;

-- Recreate as RESTRICTIVE to properly block anonymous access
CREATE POLICY "deny_anon_select"
ON public.user_roles
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);