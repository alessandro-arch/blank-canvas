-- Remove política anterior se existir
DROP POLICY IF EXISTS "bank_accounts_insert_own" ON public.bank_accounts;

-- Política para usuários autenticados inserirem apenas suas próprias contas bancárias
CREATE POLICY "bank_accounts_insert_own"
ON public.bank_accounts
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());