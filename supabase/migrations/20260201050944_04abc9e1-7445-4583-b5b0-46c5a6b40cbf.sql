-- Drop the existing RESTRICTIVE policy that could be bypassed
DROP POLICY IF EXISTS "Deny public access to profiles" ON public.profiles;

-- Create a PERMISSIVE policy that explicitly denies anonymous access
-- Using PERMISSIVE with USING (false) ensures no bypass is possible
CREATE POLICY "Deny public access to profiles"
ON public.profiles
AS PERMISSIVE
FOR SELECT
TO anon
USING (false);