-- Função para prevenir que bolsistas alterem campos de controle de validação
-- Nota: 'master' não existe no enum app_role, usando apenas 'manager' e 'admin'
CREATE OR REPLACE FUNCTION public.prevent_bank_fields_edit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Se não for gestor/admin, não pode mudar campos de controle
  IF NOT (
    has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  ) THEN
    IF (NEW.validation_status IS DISTINCT FROM OLD.validation_status)
       OR (NEW.locked_for_edit IS DISTINCT FROM OLD.locked_for_edit) THEN
      RAISE EXCEPTION 'Not allowed to change validation fields';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Remove trigger anterior se existir
DROP TRIGGER IF EXISTS trg_prevent_bank_fields_edit ON public.bank_accounts;

-- Cria trigger para executar antes de updates
CREATE TRIGGER trg_prevent_bank_fields_edit
BEFORE UPDATE ON public.bank_accounts
FOR EACH ROW
EXECUTE FUNCTION public.prevent_bank_fields_edit();