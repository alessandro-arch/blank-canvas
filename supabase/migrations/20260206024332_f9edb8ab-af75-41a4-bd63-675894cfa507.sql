-- Remove política anterior se existir
DROP POLICY IF EXISTS "bank_accounts_update_own_unvalidated" ON public.bank_accounts;

-- Política para usuários atualizarem suas contas apenas quando não bloqueadas e com status pendente/rejeitado
CREATE POLICY "bank_accounts_update_own_unvalidated"
ON public.bank_accounts
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  AND COALESCE(locked_for_edit, false) = false
  AND COALESCE(validation_status, 'pending') IN ('pending', 'returned')
)
WITH CHECK (
  user_id = auth.uid()
  AND COALESCE(locked_for_edit, false) = false
  AND COALESCE(validation_status, 'pending') IN ('pending', 'returned')
);