-- Remove política anterior se existir
DROP POLICY IF EXISTS "bank_accounts_delete_own_unvalidated" ON public.bank_accounts;

-- Política para usuários excluírem suas contas apenas quando status é pendente/rejeitado
CREATE POLICY "bank_accounts_delete_own_unvalidated"
ON public.bank_accounts
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  AND COALESCE(validation_status, 'pending') IN ('pending', 'returned')
);