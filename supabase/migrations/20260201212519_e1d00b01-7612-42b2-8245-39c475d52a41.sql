-- Drop the existing RESTRICTIVE policies for profiles UPDATE
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Managers can update all profiles" ON public.profiles;

-- Create a single PERMISSIVE policy that allows both scenarios
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (
  (auth.uid() = user_id AND is_active = true)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (auth.uid() = user_id AND is_active = true)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);