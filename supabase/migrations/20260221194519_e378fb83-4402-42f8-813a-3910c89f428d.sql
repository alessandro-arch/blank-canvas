
-- 1. Create bank_access_logs table for audit
CREATE TABLE IF NOT EXISTS public.bank_access_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_user_id uuid NOT NULL,
  actor_role text NOT NULL,
  target_user_id uuid NOT NULL,
  tenant_id uuid,
  action text NOT NULL CHECK (action IN ('view', 'update', 'create')),
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bank_access_logs_select_admin" ON public.bank_access_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "bank_access_logs_select_manager_org" ON public.bank_access_logs
  FOR SELECT USING (
    has_role(auth.uid(), 'manager'::app_role) 
    AND tenant_id IN (SELECT get_user_organizations())
  );

-- 2. Create report_access_logs table
CREATE TABLE IF NOT EXISTS public.report_access_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL,
  accessed_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  action text NOT NULL CHECK (action IN ('view', 'download')),
  organization_id uuid
);

ALTER TABLE public.report_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_access_logs_select_admin" ON public.report_access_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "report_access_logs_select_manager_org" ON public.report_access_logs
  FOR SELECT USING (
    has_role(auth.uid(), 'manager'::app_role)
    AND organization_id IN (SELECT get_user_organizations())
  );

-- 3. Add encrypted columns to bank_accounts
ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS account_number_enc text,
  ADD COLUMN IF NOT EXISTS agency_enc text,
  ADD COLUMN IF NOT EXISTS bank_code_enc text,
  ADD COLUMN IF NOT EXISTS last4_account text,
  ADD COLUMN IF NOT EXISTS has_bank_data boolean NOT NULL DEFAULT false;

-- 4. Add pdf_sha256 column to monthly_reports
ALTER TABLE public.monthly_reports
  ADD COLUMN IF NOT EXISTS pdf_sha256 text;

-- 5. Create bank_accounts_public VIEW (safe metadata only)
CREATE OR REPLACE VIEW public.bank_accounts_public AS
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
