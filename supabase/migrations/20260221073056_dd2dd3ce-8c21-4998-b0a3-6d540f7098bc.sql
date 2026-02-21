
-- ============================================================
-- FASE 2: submit_monthly_report + reopen_monthly_report RPCs
-- ============================================================

-- 1) Submit monthly report (bolsista)
CREATE OR REPLACE FUNCTION public.submit_monthly_report(
  p_report_id uuid,
  p_ip text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_report record;
  v_payload jsonb;
  v_version int;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT * INTO v_report FROM monthly_reports WHERE id = p_report_id FOR UPDATE;

  IF v_report IS NULL THEN
    RAISE EXCEPTION 'Relatório não encontrado';
  END IF;

  IF v_report.beneficiary_user_id != v_user_id THEN
    RAISE EXCEPTION 'Acesso negado: relatório pertence a outro usuário';
  END IF;

  IF v_report.status NOT IN ('draft', 'returned') THEN
    RAISE EXCEPTION 'Relatório não pode ser enviado (status: %)', v_report.status;
  END IF;

  -- Get payload
  SELECT payload INTO v_payload
  FROM monthly_report_fields WHERE report_id = p_report_id;

  -- Validate required fields
  IF v_payload IS NULL OR 
     COALESCE(v_payload->>'atividades_realizadas', '') = '' OR
     COALESCE(v_payload->>'resultados_alcancados', '') = '' THEN
    RAISE EXCEPTION 'Campos obrigatórios não preenchidos (atividades e resultados)';
  END IF;

  -- Update report status
  UPDATE monthly_reports SET
    status = 'submitted',
    submitted_at = now(),
    submitted_ip = p_ip,
    submitted_user_agent = p_user_agent,
    locked_at = now(),
    -- Clear return fields if resubmitting
    returned_at = NULL,
    returned_by_user_id = NULL,
    return_reason = NULL,
    updated_at = now()
  WHERE id = p_report_id;

  -- Create version snapshot
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
  FROM monthly_report_versions WHERE report_id = p_report_id;

  INSERT INTO monthly_report_versions (report_id, version, payload, changed_by_user_id, change_summary)
  VALUES (p_report_id, v_version, v_payload, v_user_id, 'Envio do relatório');

  -- Audit log (insert directly since scholar can't use insert_audit_log)
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, organization_id, details)
  VALUES (
    v_user_id, 'report_submitted', 'monthly_report', p_report_id,
    v_report.organization_id,
    jsonb_build_object(
      'period', v_report.period_year || '-' || LPAD(v_report.period_month::text, 2, '0'),
      'project_id', v_report.project_id,
      'version', v_version
    )
  );

  RETURN jsonb_build_object('success', true, 'version', v_version, 'submitted_at', now());
END;
$$;

-- 2) Reopen monthly report (after return, bolsista reopens for editing)
CREATE OR REPLACE FUNCTION public.reopen_monthly_report(p_report_id uuid)
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

  IF v_report.beneficiary_user_id != v_user_id THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF v_report.status != 'returned' THEN
    RAISE EXCEPTION 'Apenas relatórios devolvidos podem ser reabertos (status: %)', v_report.status;
  END IF;

  UPDATE monthly_reports SET
    status = 'draft',
    locked_at = NULL,
    updated_at = now()
  WHERE id = p_report_id;

  -- Audit log
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, organization_id, details)
  VALUES (
    v_user_id, 'report_draft_created', 'monthly_report', p_report_id,
    v_report.organization_id,
    jsonb_build_object('action', 'reopened_after_return')
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 3) Allow scholars to insert audit_logs for report actions
-- Update the existing RESTRICTIVE policy to also allow scholars for report-related actions
-- Actually, we handle this via SECURITY DEFINER functions above, so no policy change needed.

-- 4) Update monthly_reports RLS: allow update from 'returned' status for reopen
DROP POLICY IF EXISTS "monthly_reports_update_own_draft" ON monthly_reports;
CREATE POLICY "monthly_reports_update_own_draft" ON monthly_reports
  FOR UPDATE TO authenticated
  USING (beneficiary_user_id = auth.uid() AND status IN ('draft', 'returned'))
  WITH CHECK (beneficiary_user_id = auth.uid() AND status IN ('draft', 'returned'));
