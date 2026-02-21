
-- Fix 1: Add INSERT policies for audit tables (service role inserts, but need at least a deny policy for completeness)
CREATE POLICY "bank_access_logs_insert_service" ON public.bank_access_logs
  FOR INSERT WITH CHECK (false);

CREATE POLICY "report_access_logs_insert_service" ON public.report_access_logs
  FOR INSERT WITH CHECK (false);

-- Fix 2: Make the view SECURITY INVOKER (default in PG15+, but be explicit)
DROP VIEW IF EXISTS public.bank_accounts_public;
CREATE VIEW public.bank_accounts_public
WITH (security_invoker = true)
AS
SELECT
  id,
  user_id,
  bank_name,
  account_type,
  pix_key_type,
  validation_status,
  locked_for_edit,
  validated_at,
  validated_by,
  notes_gestor,
  last4_account,
  has_bank_data,
  pix_key_masked,
  created_at,
  updated_at
FROM public.bank_accounts;
