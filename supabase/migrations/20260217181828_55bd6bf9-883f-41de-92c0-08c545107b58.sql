
-- ============================================================
-- Fix pdf_logs RLS: drop RESTRICTIVE policies, recreate as PERMISSIVE
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "pdf_logs_select_admin" ON public.pdf_logs;
DROP POLICY IF EXISTS "pdf_logs_select_manager" ON public.pdf_logs;
DROP POLICY IF EXISTS "pdf_logs_select_own" ON public.pdf_logs;
DROP POLICY IF EXISTS "pdf_logs_insert_authenticated" ON public.pdf_logs;

-- SELECT: Admin can view all
CREATE POLICY "pdf_logs_select_admin"
  ON public.pdf_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- SELECT: Manager can view reports from their organizations
CREATE POLICY "pdf_logs_select_manager"
  ON public.pdf_logs FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'manager'::app_role)
    AND (
      organization_id IS NULL
      OR organization_id IN (SELECT get_user_organizations())
    )
  );

-- SELECT: Scholar can view own reports only
CREATE POLICY "pdf_logs_select_own"
  ON public.pdf_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT: Only admin and manager can insert (generate reports)
CREATE POLICY "pdf_logs_insert_admin_manager"
  ON public.pdf_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
  );

-- Block anonymous access
CREATE POLICY "pdf_logs_deny_anon"
  ON public.pdf_logs FOR SELECT
  TO anon
  USING (false);
