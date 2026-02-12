-- Drop the weak deny_anon_select policy on user_roles
DROP POLICY IF EXISTS "deny_anon_select" ON public.user_roles;

-- Create a stronger anon block matching the profiles table pattern
CREATE POLICY "deny_anon_select"
ON public.user_roles
FOR SELECT
TO anon
USING (false);