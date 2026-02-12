-- Remove política anterior se existir
DROP POLICY IF EXISTS "bank_accounts_select_manager" ON public.bank_accounts;

-- Política para gestores e admins visualizarem todas as contas bancárias
-- Nota: 'master' não existe no enum app_role, usando apenas 'manager' e 'admin'
CREATE POLICY "bank_accounts_select_manager"
ON public.bank_accounts
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);