
-- Create unified institutions table
CREATE TABLE public.institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  acronym text,
  uf text NOT NULL,
  municipality text,
  category text,
  academic_organization text,
  cnpj text,
  source text NOT NULL DEFAULT 'USER_SUBMITTED',
  status text NOT NULL DEFAULT 'pending',
  submitted_by uuid,
  institution_type text,
  rejection_reason text,
  normalized_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add institution_id to profiles
ALTER TABLE public.profiles ADD COLUMN institution_id uuid REFERENCES public.institutions(id);

-- Enable RLS
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone authenticated can read approved or own submissions
CREATE POLICY "institutions_select" ON public.institutions
  FOR SELECT TO authenticated
  USING (status = 'approved' OR submitted_by = auth.uid());

-- RLS: Authenticated users can insert pending submissions
CREATE POLICY "institutions_insert" ON public.institutions
  FOR INSERT TO authenticated
  WITH CHECK (source = 'USER_SUBMITTED' AND status = 'pending');

-- RLS: Admin/manager can update
CREATE POLICY "institutions_update" ON public.institutions
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role)
  );

-- Indices
CREATE INDEX idx_institutions_status ON public.institutions(status);
CREATE INDEX idx_institutions_uf ON public.institutions(uf);
CREATE INDEX idx_institutions_source ON public.institutions(source);

-- Unique CNPJ when not null
CREATE UNIQUE INDEX idx_institutions_cnpj_unique ON public.institutions(cnpj) WHERE cnpj IS NOT NULL AND cnpj != '';

-- Trigram index for name search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_institutions_normalized_name_trgm ON public.institutions USING gin (normalized_name gin_trgm_ops);

-- Migrate data from institutions_mec
INSERT INTO public.institutions (name, acronym, uf, municipality, category, academic_organization, source, status, normalized_name)
SELECT 
  nome,
  sigla,
  uf,
  municipio,
  categoria,
  organizacao_academica,
  'MEC',
  'approved',
  normalized_name
FROM public.institutions_mec;

-- Updated_at trigger
CREATE TRIGGER update_institutions_updated_at
  BEFORE UPDATE ON public.institutions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
