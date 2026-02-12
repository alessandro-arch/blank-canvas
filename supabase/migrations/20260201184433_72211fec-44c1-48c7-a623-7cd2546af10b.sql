-- Restructure projects table for ICCA Bolsa Conecta workflow
-- Add new required columns
ALTER TABLE public.projects ADD COLUMN modalidade_bolsa text;
ALTER TABLE public.projects ADD COLUMN valor_mensal numeric NOT NULL DEFAULT 0;

-- Add new optional column
ALTER TABLE public.projects ADD COLUMN orientador text;

-- Remove deprecated columns
ALTER TABLE public.projects DROP COLUMN IF EXISTS description;
ALTER TABLE public.projects DROP COLUMN IF EXISTS proponent_email;
ALTER TABLE public.projects DROP COLUMN IF EXISTS proponent_cpf;
ALTER TABLE public.projects DROP COLUMN IF EXISTS modalities;

-- Add unique constraint on code
ALTER TABLE public.projects ADD CONSTRAINT projects_code_unique UNIQUE (code);

-- Update valor_mensal to remove default after column exists
ALTER TABLE public.projects ALTER COLUMN valor_mensal DROP DEFAULT;

-- Add check constraint for positive valor_mensal
CREATE OR REPLACE FUNCTION public.validate_project_valor_mensal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.valor_mensal <= 0 THEN
    RAISE EXCEPTION 'valor_mensal deve ser um valor positivo';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_project_valor_mensal_trigger
BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.validate_project_valor_mensal();