-- Add is_active field to profiles for account deactivation
ALTER TABLE public.profiles 
ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Create index for faster queries on active users
CREATE INDEX idx_profiles_is_active ON public.profiles(is_active);

-- Update RLS policies to consider is_active status
-- Scholars can only view their own profile IF they are active
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can only update their own profile IF they are active
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND is_active = true);

-- Add policy for managers to update profiles (for deactivation)
CREATE POLICY "Managers can update all profiles"
ON public.profiles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Update enrollments RLS to prevent inactive users from viewing
DROP POLICY IF EXISTS "Scholars can view their own enrollments" ON public.enrollments;
CREATE POLICY "Scholars can view their own enrollments"
ON public.enrollments
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_active = true
  )
);

-- Update payments RLS to prevent inactive users from viewing
DROP POLICY IF EXISTS "Scholars can view their own payments" ON public.payments;
CREATE POLICY "Scholars can view their own payments"
ON public.payments
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_active = true
  )
);

-- Update reports RLS to prevent inactive users from viewing/inserting
DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;
CREATE POLICY "Users can view their own reports"
ON public.reports
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_active = true
  )
);

DROP POLICY IF EXISTS "Users can insert their own reports" ON public.reports;
CREATE POLICY "Users can insert their own reports"
ON public.reports
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_active = true
  )
);

-- Update bank_accounts RLS to prevent inactive users from modifying
DROP POLICY IF EXISTS "Users can view their own bank account" ON public.bank_accounts;
CREATE POLICY "Users can view their own bank account"
ON public.bank_accounts
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_active = true
  )
);

DROP POLICY IF EXISTS "Users can update their own bank account" ON public.bank_accounts;
CREATE POLICY "Users can update their own bank account"
ON public.bank_accounts
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_active = true
  )
);

DROP POLICY IF EXISTS "Users can insert their own bank account" ON public.bank_accounts;
CREATE POLICY "Users can insert their own bank account"
ON public.bank_accounts
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.is_active = true
  )
);