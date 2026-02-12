-- Drop the RESTRICTIVE policies and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Users can view their own bank account" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can update their own bank account" ON public.bank_accounts;

-- Create PERMISSIVE policy for users to view their own bank accounts
CREATE POLICY "Users can view their own bank account"
ON public.bank_accounts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create PERMISSIVE policy for users to update their own bank accounts
CREATE POLICY "Users can update their own bank account"
ON public.bank_accounts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);