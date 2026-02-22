
-- 1. Add 'auditor' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'auditor';

-- 2. Create secure audit views (no bank/PII data)
CREATE OR REPLACE VIEW public.payments_audit_view
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.amount,
  p.reference_month,
  p.installment_number,
  p.status,
  p.paid_at,
  p.receipt_url,
  p.created_at,
  p.updated_at,
  p.enrollment_id,
  p.user_id,
  pr.full_name AS scholar_name,
  e.project_id,
  proj.title AS project_title,
  proj.code AS project_code
FROM payments p
LEFT JOIN profiles pr ON pr.user_id = p.user_id
LEFT JOIN enrollments e ON e.id = p.enrollment_id
LEFT JOIN projects proj ON proj.id = e.project_id;

-- 3. Grant SELECT on the view
GRANT SELECT ON public.payments_audit_view TO authenticated;
