
-- Add manual override columns for attributed scholarships value
ALTER TABLE public.thematic_projects
  ADD COLUMN IF NOT EXISTS valor_total_atribuido_bolsas_manual numeric,
  ADD COLUMN IF NOT EXISTS atribuicao_modo text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS atribuicao_justificativa text;
