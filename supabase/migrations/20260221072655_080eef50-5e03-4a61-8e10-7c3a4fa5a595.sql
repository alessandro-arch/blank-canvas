
-- =============================================
-- FASE 1: Tabelas do Relatório Mensal Estruturado
-- =============================================

-- 1. monthly_reports (tabela principal)
CREATE TABLE public.monthly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  beneficiary_user_id uuid NOT NULL,
  period_year integer NOT NULL CHECK (period_year >= 2020 AND period_year <= 2100),
  period_month integer NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_review','approved','returned','cancelled')),
  submitted_at timestamptz,
  submitted_ip text,
  submitted_user_agent text,
  locked_at timestamptz,
  approved_at timestamptz,
  approved_by_user_id uuid,
  returned_at timestamptz,
  returned_by_user_id uuid,
  return_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(beneficiary_user_id, project_id, period_year, period_month)
);

-- 2. monthly_report_fields (conteúdo do formulário)
CREATE TABLE public.monthly_report_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.monthly_reports(id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(report_id)
);

-- 3. monthly_report_versions (histórico)
CREATE TABLE public.monthly_report_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.monthly_reports(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  changed_by_user_id uuid NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  change_summary text
);

-- 4. monthly_report_documents (PDFs e arquivos oficiais)
CREATE TABLE public.monthly_report_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.monthly_reports(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('official_pdf','final_pdf','attachment')),
  storage_path text NOT NULL,
  sha256 text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by_user_id uuid NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- =============================================
-- Índices de performance
-- =============================================
CREATE INDEX idx_monthly_reports_beneficiary_project_period 
  ON public.monthly_reports(beneficiary_user_id, project_id, period_year, period_month);
CREATE INDEX idx_monthly_reports_org_period 
  ON public.monthly_reports(organization_id, period_year, period_month);
CREATE INDEX idx_monthly_report_fields_report 
  ON public.monthly_report_fields(report_id);
CREATE INDEX idx_monthly_report_versions_report 
  ON public.monthly_report_versions(report_id);
CREATE INDEX idx_monthly_report_documents_report 
  ON public.monthly_report_documents(report_id);

-- =============================================
-- Trigger updated_at
-- =============================================
CREATE TRIGGER update_monthly_reports_updated_at
  BEFORE UPDATE ON public.monthly_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_monthly_report_fields_updated_at
  BEFORE UPDATE ON public.monthly_report_fields
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RLS: monthly_reports
-- =============================================
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;

-- Bolsista: ver seus próprios relatórios
CREATE POLICY "monthly_reports_select_own"
  ON public.monthly_reports FOR SELECT
  TO authenticated
  USING (beneficiary_user_id = auth.uid());

-- Bolsista: inserir próprios (via RPC preferencialmente)
CREATE POLICY "monthly_reports_insert_own"
  ON public.monthly_reports FOR INSERT
  TO authenticated
  WITH CHECK (beneficiary_user_id = auth.uid());

-- Bolsista: atualizar apenas rascunhos próprios
CREATE POLICY "monthly_reports_update_own_draft"
  ON public.monthly_reports FOR UPDATE
  TO authenticated
  USING (beneficiary_user_id = auth.uid() AND status = 'draft')
  WITH CHECK (beneficiary_user_id = auth.uid() AND status = 'draft');

-- Gestor/Admin: ver relatórios da organização
CREATE POLICY "monthly_reports_select_org"
  ON public.monthly_reports FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR (has_role(auth.uid(), 'manager'::app_role) AND organization_id IN (SELECT get_user_organizations()))
  );

-- Deny anon
CREATE POLICY "monthly_reports_deny_anon"
  ON public.monthly_reports FOR SELECT
  TO anon
  USING (false);

-- =============================================
-- RLS: monthly_report_fields
-- =============================================
ALTER TABLE public.monthly_report_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monthly_report_fields_select_own"
  ON public.monthly_report_fields FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.monthly_reports mr 
    WHERE mr.id = report_id AND mr.beneficiary_user_id = auth.uid()
  ));

CREATE POLICY "monthly_report_fields_select_org"
  ON public.monthly_report_fields FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.monthly_reports mr 
    WHERE mr.id = report_id 
    AND (has_role(auth.uid(), 'admin'::app_role) 
         OR (has_role(auth.uid(), 'manager'::app_role) AND mr.organization_id IN (SELECT get_user_organizations())))
  ));

CREATE POLICY "monthly_report_fields_insert_own"
  ON public.monthly_report_fields FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.monthly_reports mr 
    WHERE mr.id = report_id AND mr.beneficiary_user_id = auth.uid() AND mr.status = 'draft'
  ));

CREATE POLICY "monthly_report_fields_update_own_draft"
  ON public.monthly_report_fields FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.monthly_reports mr 
    WHERE mr.id = report_id AND mr.beneficiary_user_id = auth.uid() AND mr.status = 'draft'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.monthly_reports mr 
    WHERE mr.id = report_id AND mr.beneficiary_user_id = auth.uid() AND mr.status = 'draft'
  ));

-- =============================================
-- RLS: monthly_report_versions
-- =============================================
ALTER TABLE public.monthly_report_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monthly_report_versions_select_own"
  ON public.monthly_report_versions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.monthly_reports mr 
    WHERE mr.id = report_id AND mr.beneficiary_user_id = auth.uid()
  ));

CREATE POLICY "monthly_report_versions_select_org"
  ON public.monthly_report_versions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.monthly_reports mr 
    WHERE mr.id = report_id 
    AND (has_role(auth.uid(), 'admin'::app_role) 
         OR (has_role(auth.uid(), 'manager'::app_role) AND mr.organization_id IN (SELECT get_user_organizations())))
  ));

-- =============================================
-- RLS: monthly_report_documents
-- =============================================
ALTER TABLE public.monthly_report_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monthly_report_documents_select_own"
  ON public.monthly_report_documents FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.monthly_reports mr 
    WHERE mr.id = report_id AND mr.beneficiary_user_id = auth.uid()
  ));

CREATE POLICY "monthly_report_documents_select_org"
  ON public.monthly_report_documents FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.monthly_reports mr 
    WHERE mr.id = report_id 
    AND (has_role(auth.uid(), 'admin'::app_role) 
         OR (has_role(auth.uid(), 'manager'::app_role) AND mr.organization_id IN (SELECT get_user_organizations())))
  ));

-- =============================================
-- Função auxiliar: monthly_report_belongs_to_user_org
-- =============================================
CREATE OR REPLACE FUNCTION public.monthly_report_belongs_to_user_org(p_report_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.monthly_reports mr
    WHERE mr.id = p_report_id
    AND mr.organization_id IN (SELECT get_user_organizations())
  )
$$;

-- =============================================
-- Security Definer: create_monthly_report_draft
-- =============================================
CREATE OR REPLACE FUNCTION public.create_monthly_report_draft(
  p_project_id uuid,
  p_year integer,
  p_month integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_report_id uuid;
  v_fields_id uuid;
  v_existing_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Verificar se já existe relatório para este período
  SELECT id INTO v_existing_id
  FROM monthly_reports
  WHERE beneficiary_user_id = v_user_id
    AND project_id = p_project_id
    AND period_year = p_year
    AND period_month = p_month;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('report_id', v_existing_id, 'status', 'existing');
  END IF;

  -- Buscar organization_id via projeto -> thematic_project
  SELECT tp.organization_id INTO v_org_id
  FROM projects p
  JOIN thematic_projects tp ON tp.id = p.thematic_project_id
  WHERE p.id = p_project_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Projeto não encontrado ou sem organização';
  END IF;

  -- Verificar que o bolsista tem matrícula ativa neste projeto
  IF NOT EXISTS (
    SELECT 1 FROM enrollments 
    WHERE user_id = v_user_id AND project_id = p_project_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Bolsista não possui matrícula ativa neste projeto';
  END IF;

  -- Criar relatório
  INSERT INTO monthly_reports (organization_id, project_id, beneficiary_user_id, period_year, period_month, status)
  VALUES (v_org_id, p_project_id, v_user_id, p_year, p_month, 'draft')
  RETURNING id INTO v_report_id;

  -- Criar registro de campos vazio
  INSERT INTO monthly_report_fields (report_id, payload)
  VALUES (v_report_id, '{}'::jsonb)
  RETURNING id INTO v_fields_id;

  RETURN jsonb_build_object('report_id', v_report_id, 'fields_id', v_fields_id, 'status', 'created');
END;
$$;

-- =============================================
-- Security Definer: save_monthly_report_draft
-- =============================================
CREATE OR REPLACE FUNCTION public.save_monthly_report_draft(
  p_report_id uuid,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_report record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT * INTO v_report FROM monthly_reports WHERE id = p_report_id;

  IF v_report IS NULL THEN
    RAISE EXCEPTION 'Relatório não encontrado';
  END IF;

  IF v_report.beneficiary_user_id != v_user_id THEN
    RAISE EXCEPTION 'Acesso negado: relatório pertence a outro usuário';
  END IF;

  IF v_report.status != 'draft' THEN
    RAISE EXCEPTION 'Relatório não pode ser editado (status: %)', v_report.status;
  END IF;

  -- Upsert campos
  INSERT INTO monthly_report_fields (report_id, payload)
  VALUES (p_report_id, p_payload)
  ON CONFLICT (report_id) DO UPDATE SET
    payload = p_payload,
    updated_at = now();

  -- Atualizar updated_at do relatório principal
  UPDATE monthly_reports SET updated_at = now() WHERE id = p_report_id;

  RETURN jsonb_build_object('success', true, 'saved_at', now());
END;
$$;
