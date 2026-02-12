-- Remove política anterior se existir
DROP POLICY IF EXISTS "bank_accounts_select_own" ON public.bank_accounts;

-- Política para usuários autenticados verem apenas suas próprias contas bancárias
CREATE POLICY "bank_accounts_select_own"
ON public.bank_accounts
FOR SELECT
TO authenticated
USING (user_id = auth.uid());