
-- Function for manager/admin to approve a monthly report
CREATE OR REPLACE FUNCTION public.approve_monthly_report(p_report_id uuid, p_feedback text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_report record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT * INTO v_report FROM monthly_reports WHERE id = p_report_id FOR UPDATE;

  IF v_report IS NULL THEN
    RAISE EXCEPTION 'Relatório não encontrado';
  END IF;

  -- Check org access
  IF NOT (has_role(v_user_id, 'admin'::app_role) OR
          (has_role(v_user_id, 'manager'::app_role) AND monthly_report_belongs_to_user_org(p_report_id))) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF v_report.status NOT IN ('submitted', 'under_review') THEN
    RAISE EXCEPTION 'Apenas relatórios enviados podem ser aprovados (status: %)', v_report.status;
  END IF;

  UPDATE monthly_reports SET
    status = 'approved',
    approved_at = now(),
    approved_by_user_id = v_user_id,
    updated_at = now()
  WHERE id = p_report_id;

  -- Audit log
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, organization_id, details)
  VALUES (
    v_user_id, 'monthly_report_approved', 'monthly_report', p_report_id,
    v_report.organization_id,
    jsonb_build_object(
      'period', v_report.period_year || '-' || LPAD(v_report.period_month::text, 2, '0'),
      'project_id', v_report.project_id,
      'beneficiary_user_id', v_report.beneficiary_user_id,
      'feedback', p_feedback
    )
  );

  RETURN jsonb_build_object('success', true, 'approved_at', now());
END;
$$;

-- Function for manager/admin to return a monthly report
CREATE OR REPLACE FUNCTION public.return_monthly_report(p_report_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_report record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF COALESCE(TRIM(p_reason), '') = '' THEN
    RAISE EXCEPTION 'O motivo da devolução é obrigatório';
  END IF;

  SELECT * INTO v_report FROM monthly_reports WHERE id = p_report_id FOR UPDATE;

  IF v_report IS NULL THEN
    RAISE EXCEPTION 'Relatório não encontrado';
  END IF;

  -- Check org access
  IF NOT (has_role(v_user_id, 'admin'::app_role) OR
          (has_role(v_user_id, 'manager'::app_role) AND monthly_report_belongs_to_user_org(p_report_id))) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF v_report.status NOT IN ('submitted', 'under_review') THEN
    RAISE EXCEPTION 'Apenas relatórios enviados podem ser devolvidos (status: %)', v_report.status;
  END IF;

  UPDATE monthly_reports SET
    status = 'returned',
    returned_at = now(),
    returned_by_user_id = v_user_id,
    return_reason = p_reason,
    locked_at = NULL,
    updated_at = now()
  WHERE id = p_report_id;

  -- Audit log
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, organization_id, details)
  VALUES (
    v_user_id, 'monthly_report_returned', 'monthly_report', p_report_id,
    v_report.organization_id,
    jsonb_build_object(
      'period', v_report.period_year || '-' || LPAD(v_report.period_month::text, 2, '0'),
      'project_id', v_report.project_id,
      'beneficiary_user_id', v_report.beneficiary_user_id,
      'reason', p_reason
    )
  );

  RETURN jsonb_build_object('success', true, 'returned_at', now());
END;
$$;

-- Add UPDATE policy for managers on monthly_reports (to approve/return)
CREATE POLICY "monthly_reports_update_org_manager"
ON public.monthly_reports
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'manager'::app_role) AND organization_id IN (SELECT get_user_organizations()))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'manager'::app_role) AND organization_id IN (SELECT get_user_organizations()))
);
