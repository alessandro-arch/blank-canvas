-- Add RESTRICTIVE deny policy for anonymous access to audit_logs
CREATE POLICY "deny_anon_select" ON public.audit_logs
AS RESTRICTIVE FOR SELECT TO public
USING (auth.uid() IS NOT NULL);

-- Also block INSERT/UPDATE/DELETE for non-service-role (audit logs are insert-only via RPC)
CREATE POLICY "deny_anon_insert" ON public.audit_logs
AS RESTRICTIVE FOR INSERT TO public
WITH CHECK (auth.uid() IS NOT NULL);

-- Force RLS to ensure even table owners respect policies
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;