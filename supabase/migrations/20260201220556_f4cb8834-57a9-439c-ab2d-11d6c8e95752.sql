-- Drop existing INSERT policy if exists
DROP POLICY IF EXISTS "Users can insert their own bank accounts" ON public.bank_accounts;

-- Create policy for users to insert their own bank accounts
CREATE POLICY "Users can insert their own bank accounts"
ON public.bank_accounts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Also ensure UPDATE policy exists for users to update their own bank accounts
DROP POLICY IF EXISTS "Users can update their own bank accounts" ON public.bank_accounts;

CREATE POLICY "Users can update their own bank accounts"
ON public.bank_accounts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);