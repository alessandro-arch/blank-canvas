
-- 1. Clear existing PII from audit_logs (emails resolvable via user_id join)
UPDATE public.audit_logs SET user_email = NULL WHERE user_email IS NOT NULL;
UPDATE public.audit_logs SET user_agent = NULL WHERE user_agent IS NOT NULL;
UPDATE public.audit_logs SET ip_address = NULL WHERE ip_address IS NOT NULL;

-- 2. Fix RLS policies: replace RESTRICTIVE with PERMISSIVE (per project guidelines)
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "deny_anon_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "deny_anon_select" ON public.audit_logs;

-- Create proper PERMISSIVE policies
-- SELECT: only admins can view audit logs
CREATE POLICY "audit_logs_select_admin"
ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- INSERT: only authenticated admins/managers can insert (via insert_audit_log function)
CREATE POLICY "audit_logs_insert_authenticated"
ON public.audit_logs
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);
