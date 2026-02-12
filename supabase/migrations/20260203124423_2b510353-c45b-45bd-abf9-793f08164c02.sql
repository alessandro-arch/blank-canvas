-- Fix: Restrict managers to only view active profiles by default
-- This reduces the exposure of sensitive PII (CPF, email, phone)

-- Drop the existing manager policy
DROP POLICY IF EXISTS "Managers can view all profiles" ON public.profiles;

-- Create a more restrictive policy that only shows active profiles
-- Admins can still see all profiles for legitimate administrative purposes
CREATE POLICY "Managers can view active profiles"
ON public.profiles
FOR SELECT
USING (
  (has_role(auth.uid(), 'manager'::app_role) AND is_active = true)
  OR has_role(auth.uid(), 'admin'::app_role)
);