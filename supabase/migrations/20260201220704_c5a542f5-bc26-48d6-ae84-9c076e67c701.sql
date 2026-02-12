-- Drop existing INSERT/UPDATE policies and recreate as PERMISSIVE (default)
DROP POLICY IF EXISTS "Users can insert their own bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can update their own bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can insert their own bank account" ON public.bank_accounts;

-- Create PERMISSIVE policy for users to insert their own bank accounts
CREATE POLICY "Users can insert their own bank account"
ON public.bank_accounts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);