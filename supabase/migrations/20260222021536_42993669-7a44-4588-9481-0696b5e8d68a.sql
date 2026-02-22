
-- 1. Add 'blocked' to payment_status enum
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'blocked';

-- 2. Add columns to payments table
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS status_reason text,
  ADD COLUMN IF NOT EXISTS status_gate_snapshot jsonb;

-- 3. Create payment_status_log table
CREATE TABLE IF NOT EXISTS public.payment_status_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id),
  user_id uuid NOT NULL,
  enrollment_id uuid NOT NULL,
  period_key text NOT NULL,
  old_status text NOT NULL,
  new_status text NOT NULL,
  status_reason text,
  gates jsonb NOT NULL DEFAULT '{}'::jsonb,
  origin text NOT NULL,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_status_log_payment_id ON public.payment_status_log(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_status_log_user_period ON public.payment_status_log(user_id, period_key);

ALTER TABLE public.payment_status_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_status_log_select_admin" ON public.payment_status_log
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "payment_status_log_select_manager" ON public.payment_status_log
  FOR SELECT USING (
    has_role(auth.uid(), 'manager'::app_role)
    AND enrollment_in_user_org(enrollment_id)
  );

CREATE POLICY "payment_status_log_select_own" ON public.payment_status_log
  FOR SELECT USING (user_id = auth.uid());

-- 4. Create fn_evaluate_payment_gates
CREATE OR REPLACE FUNCTION public.fn_evaluate_payment_gates(
  p_user_id uuid,
  p_project_id uuid,
  p_period_key text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_year int;
  v_month int;
  v_report_ok boolean := false;
  v_scholarship_ok boolean := false;
  v_bank_ok boolean := false;
  v_report_status text;
  v_enrollment_status text;
  v_bank_status text;
  v_bank_validated_at timestamptz;
  v_bank_validated_by uuid;
  v_should_status text;
  v_reason text;
  v_period_start date;
  v_period_end date;
BEGIN
  -- Parse period
  v_period_start := (p_period_key || '-01')::date;
  v_year := EXTRACT(YEAR FROM v_period_start)::int;
  v_month := EXTRACT(MONTH FROM v_period_start)::int;
  v_period_end := (v_period_start + interval '1 month' - interval '1 day')::date;

  -- Gate A: Report approved
  SELECT mr.status INTO v_report_status
  FROM monthly_reports mr
  WHERE mr.beneficiary_user_id = p_user_id
    AND mr.project_id = p_project_id
    AND mr.period_year = v_year
    AND mr.period_month = v_month
  ORDER BY mr.updated_at DESC
  LIMIT 1;

  v_report_ok := COALESCE(v_report_status, '') = 'approved';

  -- Gate B: Enrollment active and within dates
  SELECT e.status INTO v_enrollment_status
  FROM enrollments e
  WHERE e.user_id = p_user_id
    AND e.project_id = p_project_id
    AND e.status = 'active'
    AND e.start_date <= v_period_end
    AND e.end_date >= v_period_start
  LIMIT 1;

  v_scholarship_ok := COALESCE(v_enrollment_status, '') = 'active';

  -- Gate C: Bank data validated
  SELECT ba.validation_status, ba.validated_at, ba.validated_by
  INTO v_bank_status, v_bank_validated_at, v_bank_validated_by
  FROM bank_accounts ba
  WHERE ba.user_id = p_user_id
    AND ba.validation_status = 'approved'
    AND ba.validated_at IS NOT NULL
    AND ba.validated_by IS NOT NULL
  LIMIT 1;

  v_bank_ok := COALESCE(v_bank_status, '') = 'approved'
    AND v_bank_validated_at IS NOT NULL
    AND v_bank_validated_by IS NOT NULL;

  -- Determine should_status and reason (priority order)
  IF v_report_ok AND v_scholarship_ok AND v_bank_ok THEN
    v_should_status := 'eligible';
    v_reason := 'all_ok';
  ELSIF NOT v_scholarship_ok THEN
    v_should_status := 'blocked';
    v_reason := 'scholarship_inactive';
  ELSIF NOT v_bank_ok THEN
    v_should_status := 'blocked';
    v_reason := 'bank_not_verified';
  ELSIF COALESCE(v_report_status, '') = 'returned' THEN
    v_should_status := 'blocked';
    v_reason := 'report_returned';
  ELSE
    v_should_status := 'pending';
    v_reason := 'report_not_approved';
  END IF;

  RETURN jsonb_build_object(
    'report_ok', v_report_ok,
    'scholarship_ok', v_scholarship_ok,
    'bank_ok', v_bank_ok,
    'report_status', COALESCE(v_report_status, 'none'),
    'enrollment_status', COALESCE(v_enrollment_status, 'none'),
    'bank_status', COALESCE(v_bank_status, 'none'),
    'should_status', v_should_status,
    'reason', v_reason
  );
END;
$$;

-- 5. Create fn_sync_payment_status
CREATE OR REPLACE FUNCTION public.fn_sync_payment_status(
  p_user_id uuid,
  p_project_id uuid,
  p_period_key text,
  p_actor_user_id uuid DEFAULT NULL,
  p_origin text DEFAULT 'manual_recalc'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_gates jsonb;
  v_should_status text;
  v_reason text;
  v_payment record;
  v_enrollment_id uuid;
BEGIN
  -- Evaluate gates
  v_gates := fn_evaluate_payment_gates(p_user_id, p_project_id, p_period_key);
  v_should_status := v_gates->>'should_status';
  v_reason := v_gates->>'reason';

  -- Find enrollment (most recent)
  SELECT e.id INTO v_enrollment_id
  FROM enrollments e
  WHERE e.user_id = p_user_id
    AND e.project_id = p_project_id
  ORDER BY e.created_at DESC
  LIMIT 1;

  IF v_enrollment_id IS NULL THEN
    RETURN;
  END IF;

  -- Find payment
  SELECT * INTO v_payment
  FROM payments p
  WHERE p.enrollment_id = v_enrollment_id
    AND p.reference_month = p_period_key
  FOR UPDATE;

  IF v_payment IS NULL THEN
    RETURN;
  END IF;

  -- Don't touch paid or cancelled payments (terminal states)
  IF v_payment.status IN ('paid', 'cancelled') THEN
    RETURN;
  END IF;

  -- Idempotency: skip if status and reason already match
  IF v_payment.status::text = v_should_status
     AND COALESCE(v_payment.status_reason, '') = COALESCE(v_reason, '') THEN
    RETURN;
  END IF;

  -- Update payment
  UPDATE payments SET
    status = v_should_status::payment_status,
    status_reason = v_reason,
    status_gate_snapshot = v_gates,
    updated_at = now()
  WHERE id = v_payment.id;

  -- Log transition
  INSERT INTO payment_status_log (
    payment_id, user_id, enrollment_id, period_key,
    old_status, new_status, status_reason, gates, origin, changed_by
  ) VALUES (
    v_payment.id, p_user_id, v_enrollment_id, p_period_key,
    v_payment.status::text, v_should_status, v_reason, v_gates, p_origin,
    COALESCE(p_actor_user_id, auth.uid())
  );
END;
$$;

-- 6. Trigger: monthly_reports status change → sync payment
CREATE OR REPLACE FUNCTION public.trigger_sync_payment_on_report_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_period_key text;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_period_key := NEW.period_year || '-' || LPAD(NEW.period_month::text, 2, '0');

  PERFORM fn_sync_payment_status(
    NEW.beneficiary_user_id,
    NEW.project_id,
    v_period_key,
    COALESCE(NEW.approved_by_user_id, NEW.returned_by_user_id),
    'report_status_change'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_payment_on_report_change
  AFTER UPDATE OF status ON public.monthly_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sync_payment_on_report_change();

-- 7. Trigger: enrollments status change → sync all non-terminal payments
CREATE OR REPLACE FUNCTION public.trigger_sync_payment_on_enrollment_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_payment record;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  FOR v_payment IN
    SELECT p.reference_month
    FROM payments p
    WHERE p.enrollment_id = NEW.id
      AND p.status NOT IN ('paid', 'cancelled')
  LOOP
    PERFORM fn_sync_payment_status(
      NEW.user_id,
      NEW.project_id,
      v_payment.reference_month,
      NULL,
      'scholarship_change'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_payment_on_enrollment_change
  AFTER UPDATE OF status ON public.enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sync_payment_on_enrollment_change();

-- 8. Trigger: bank_accounts validation_status change → sync all open payments for user
CREATE OR REPLACE FUNCTION public.trigger_sync_payment_on_bank_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_enrollment record;
  v_payment record;
BEGIN
  IF OLD.validation_status = NEW.validation_status THEN
    RETURN NEW;
  END IF;

  FOR v_enrollment IN
    SELECT e.id, e.project_id
    FROM enrollments e
    WHERE e.user_id = NEW.user_id
  LOOP
    FOR v_payment IN
      SELECT p.reference_month
      FROM payments p
      WHERE p.enrollment_id = v_enrollment.id
        AND p.status NOT IN ('paid', 'cancelled')
    LOOP
      PERFORM fn_sync_payment_status(
        NEW.user_id,
        v_enrollment.project_id,
        v_payment.reference_month,
        NULL,
        'bank_validation_change'
      );
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_payment_on_bank_change
  AFTER UPDATE OF validation_status ON public.bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_sync_payment_on_bank_change();
