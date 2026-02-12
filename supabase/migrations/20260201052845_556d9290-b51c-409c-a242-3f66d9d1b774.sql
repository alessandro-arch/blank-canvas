-- Remove the blocking policy that denies all access
DROP POLICY IF EXISTS "Deny public access to profiles" ON public.profiles;

-- Drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Managers can view all profiles" ON public.profiles;

-- Recreate as PERMISSIVE policies (default)
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));