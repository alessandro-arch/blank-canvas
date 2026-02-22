
-- Fix RLS: block direct INSERT/UPDATE/DELETE on payment_status_log (only SECURITY DEFINER functions write)
-- Also make existing SELECT policies PERMISSIVE (drop & recreate)

DROP POLICY IF EXISTS "payment_status_log_select_admin" ON public.payment_status_log;
DROP POLICY IF EXISTS "payment_status_log_select_manager" ON public.payment_status_log;
DROP POLICY IF EXISTS "payment_status_log_select_own" ON public.payment_status_log;

CREATE POLICY "payment_status_log_select_admin" ON public.payment_status_log
  AS PERMISSIVE FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "payment_status_log_select_manager" ON public.payment_status_log
  AS PERMISSIVE FOR SELECT
  USING (
    has_role(auth.uid(), 'manager'::app_role)
    AND enrollment_in_user_org(enrollment_id)
  );

CREATE POLICY "payment_status_log_select_own" ON public.payment_status_log
  AS PERMISSIVE FOR SELECT
  USING (user_id = auth.uid());

-- Block direct writes - only SECURITY DEFINER functions can insert
CREATE POLICY "payment_status_log_no_direct_insert" ON public.payment_status_log
  AS PERMISSIVE FOR INSERT
  WITH CHECK (false);

CREATE POLICY "payment_status_log_no_direct_update" ON public.payment_status_log
  AS PERMISSIVE FOR UPDATE
  USING (false);

CREATE POLICY "payment_status_log_no_direct_delete" ON public.payment_status_log
  AS PERMISSIVE FOR DELETE
  USING (false);
