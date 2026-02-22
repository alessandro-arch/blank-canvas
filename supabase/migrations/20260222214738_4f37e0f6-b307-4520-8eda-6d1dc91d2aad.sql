
-- Create institutions_mec table
CREATE TABLE public.institutions_mec (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_ies integer,
  nome text NOT NULL,
  sigla text,
  uf char(2) NOT NULL,
  categoria text,
  organizacao_academica text,
  municipio text,
  situacao text,
  normalized_name text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_institutions_mec_nome ON public.institutions_mec (nome);
CREATE INDEX idx_institutions_mec_sigla ON public.institutions_mec (sigla);
CREATE INDEX idx_institutions_mec_uf ON public.institutions_mec (uf);
CREATE INDEX idx_institutions_mec_normalized ON public.institutions_mec (normalized_name);

-- RLS: read for any authenticated user
ALTER TABLE public.institutions_mec ENABLE ROW LEVEL SECURITY;
CREATE POLICY "institutions_mec_select_authenticated"
  ON public.institutions_mec FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Add structured institution columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS institution_sigla text,
  ADD COLUMN IF NOT EXISTS institution_uf char(2),
  ADD COLUMN IF NOT EXISTS institution_is_custom boolean DEFAULT false;
