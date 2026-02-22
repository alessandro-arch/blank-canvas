
-- Fix Gate C: bank_accounts.validation_status uses 'validated' not 'approved'
CREATE OR REPLACE FUNCTION public.fn_evaluate_payment_gates(
  p_user_id uuid,
  p_project_id uuid,
  p_period_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Gate C: Bank data validated (status is 'validated' in the enum)
  SELECT ba.validation_status::text, ba.validated_at, ba.validated_by
  INTO v_bank_status, v_bank_validated_at, v_bank_validated_by
  FROM bank_accounts ba
  WHERE ba.user_id = p_user_id
    AND ba.validation_status = 'validated'
    AND ba.validated_at IS NOT NULL
    AND ba.validated_by IS NOT NULL
  LIMIT 1;

  v_bank_ok := COALESCE(v_bank_status, '') = 'validated'
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
