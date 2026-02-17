
-- Add financial columns to thematic_projects
ALTER TABLE public.thematic_projects
  ADD COLUMN IF NOT EXISTS valor_total_projeto numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxa_administrativa_percentual numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS impostos_percentual numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contrato_projeto_url text,
  ADD COLUMN IF NOT EXISTS contrato_projeto_nome text,
  ADD COLUMN IF NOT EXISTS contrato_projeto_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS plano_trabalho_url text,
  ADD COLUMN IF NOT EXISTS plano_trabalho_nome text,
  ADD COLUMN IF NOT EXISTS plano_trabalho_uploaded_at timestamptz;

-- Create storage bucket for project documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos-projetos', 'documentos-projetos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for documentos-projetos bucket
CREATE POLICY "Managers and admins can upload project docs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documentos-projetos'
  AND (
    public.has_role(auth.uid(), 'manager'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

CREATE POLICY "Managers and admins can view project docs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documentos-projetos'
  AND (
    public.has_role(auth.uid(), 'manager'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

CREATE POLICY "Managers and admins can update project docs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documentos-projetos'
  AND (
    public.has_role(auth.uid(), 'manager'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

CREATE POLICY "Managers and admins can delete project docs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documentos-projetos'
  AND (
    public.has_role(auth.uid(), 'manager'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);
