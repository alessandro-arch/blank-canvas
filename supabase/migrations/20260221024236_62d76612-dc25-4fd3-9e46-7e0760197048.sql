
-- 1. Add columns to enrollments for cancel/replace tracking
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cancel_reason text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS effective_cancel_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS replaced_by_enrollment_id uuid DEFAULT NULL REFERENCES public.enrollments(id);

-- 2. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_enrollments_project_status ON public.enrollments(project_id, status);
CREATE INDEX IF NOT EXISTS idx_enrollments_replaced_by ON public.enrollments(replaced_by_enrollment_id) WHERE replaced_by_enrollment_id IS NOT NULL;

-- 3. RPC: Cancel scholarship
CREATE OR REPLACE FUNCTION public.cancel_scholarship(
  p_enrollment_id uuid,
  p_reason text,
  p_effective_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_enrollment record;
  v_paid_count int;
  v_remaining int;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Only admin or manager with org access
  IF NOT (has_role(v_user_id, 'admin'::app_role) OR 
          (has_role(v_user_id, 'manager'::app_role) AND enrollment_in_user_org(p_enrollment_id))) THEN
    RAISE EXCEPTION 'Acesso negado: apenas admins e gestores podem cancelar bolsas';
  END IF;

  SELECT * INTO v_enrollment FROM enrollments WHERE id = p_enrollment_id FOR UPDATE;
  
  IF v_enrollment IS NULL THEN
    RAISE EXCEPTION 'Vínculo não encontrado';
  END IF;

  IF v_enrollment.status != 'active' THEN
    RAISE EXCEPTION 'Só é possível cancelar vínculos ativos (status atual: %)', v_enrollment.status;
  END IF;

  -- Count paid installments
  SELECT COUNT(*) INTO v_paid_count
  FROM payments
  WHERE enrollment_id = p_enrollment_id AND status = 'paid';

  v_remaining := v_enrollment.total_installments - v_paid_count;

  -- Default effective date: first day of next month
  IF p_effective_date IS NULL THEN
    p_effective_date := date_trunc('month', now() + interval '1 month')::date;
  END IF;

  -- Update enrollment
  UPDATE enrollments SET
    status = 'cancelled',
    canceled_at = now(),
    cancel_reason = p_reason,
    effective_cancel_date = p_effective_date,
    updated_at = now()
  WHERE id = p_enrollment_id;

  -- Cancel future pending/eligible payments (reference_month >= effective period)
  UPDATE payments SET
    status = 'cancelled',
    updated_at = now()
  WHERE enrollment_id = p_enrollment_id
    AND status IN ('pending', 'eligible')
    AND reference_month >= to_char(p_effective_date, 'YYYY-MM');

  -- Audit log
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (
    v_user_id,
    'scholarship_canceled',
    'enrollment',
    p_enrollment_id,
    jsonb_build_object(
      'project_id', v_enrollment.project_id,
      'scholar_user_id', v_enrollment.user_id,
      'reason', p_reason,
      'effective_date', p_effective_date,
      'installments_total', v_enrollment.total_installments,
      'installments_paid', v_paid_count,
      'installments_remaining', v_remaining
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'installments_paid', v_paid_count,
    'installments_remaining', v_remaining
  );
END;
$$;

-- 4. RPC: Replace scholarship (assign substitute)
CREATE OR REPLACE FUNCTION public.replace_scholarship(
  p_old_enrollment_id uuid,
  p_new_scholar_user_id uuid,
  p_start_date date DEFAULT NULL,
  p_monthly_amount numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old record;
  v_paid_count int;
  v_remaining int;
  v_new_id uuid;
  v_user_id uuid;
  v_new_end_date date;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF NOT (has_role(v_user_id, 'admin'::app_role) OR 
          (has_role(v_user_id, 'manager'::app_role) AND enrollment_in_user_org(p_old_enrollment_id))) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT * INTO v_old FROM enrollments WHERE id = p_old_enrollment_id FOR UPDATE;
  
  IF v_old IS NULL THEN
    RAISE EXCEPTION 'Vínculo original não encontrado';
  END IF;

  IF v_old.status != 'cancelled' THEN
    RAISE EXCEPTION 'Só é possível substituir vínculos cancelados (status atual: %)', v_old.status;
  END IF;

  IF v_old.replaced_by_enrollment_id IS NOT NULL THEN
    RAISE EXCEPTION 'Este vínculo já foi substituído';
  END IF;

  -- Count paid installments
  SELECT COUNT(*) INTO v_paid_count
  FROM payments
  WHERE enrollment_id = p_old_enrollment_id AND status = 'paid';

  v_remaining := v_old.total_installments - v_paid_count;

  IF v_remaining <= 0 THEN
    RAISE EXCEPTION 'Não há parcelas restantes para atribuir ao substituto';
  END IF;

  -- Defaults
  IF p_start_date IS NULL THEN
    p_start_date := COALESCE(v_old.effective_cancel_date, date_trunc('month', now() + interval '1 month')::date);
  END IF;

  IF p_monthly_amount IS NULL THEN
    p_monthly_amount := v_old.grant_value;
  END IF;

  -- Calculate new end date: keep original end_date of the project or calculate from remaining
  v_new_end_date := v_old.end_date;

  -- Create new enrollment
  INSERT INTO enrollments (
    project_id, user_id, modality, grant_value, 
    start_date, end_date, total_installments, status
  ) VALUES (
    v_old.project_id, p_new_scholar_user_id, v_old.modality, p_monthly_amount,
    p_start_date, v_new_end_date, v_remaining, 'active'
  ) RETURNING id INTO v_new_id;

  -- Link old enrollment to new
  UPDATE enrollments SET
    replaced_by_enrollment_id = v_new_id,
    updated_at = now()
  WHERE id = p_old_enrollment_id;

  -- Audit log
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (
    v_user_id,
    'scholarship_replaced',
    'enrollment',
    v_new_id,
    jsonb_build_object(
      'project_id', v_old.project_id,
      'old_enrollment_id', p_old_enrollment_id,
      'old_scholar_user_id', v_old.user_id,
      'new_scholar_user_id', p_new_scholar_user_id,
      'remaining_installments', v_remaining,
      'monthly_amount', p_monthly_amount,
      'start_date', p_start_date
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_enrollment_id', v_new_id,
    'installments_remaining', v_remaining,
    'start_date', p_start_date,
    'end_date', v_new_end_date
  );
END;
$$;
