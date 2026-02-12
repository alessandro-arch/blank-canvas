-- Drop existing policies to replace with new ones
DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can insert their own reports" ON public.reports;
DROP POLICY IF EXISTS "Managers can view all reports" ON public.reports;
DROP POLICY IF EXISTS "Managers can update reports" ON public.reports;

-- Force RLS to prevent any bypass
ALTER TABLE public.reports FORCE ROW LEVEL SECURITY;

-- 1) Bolsista: vê só os próprios relatórios
CREATE POLICY "Reports: select own"
ON public.reports
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 2) Bolsista: cria relatório só para si
CREATE POLICY "Reports: insert own"
ON public.reports
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 3) Gestor e Admin: revisam tudo
CREATE POLICY "Reports: select manager/admin"
ON public.reports
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 4) Gestor e Admin: atualizam status e feedback
CREATE POLICY "Reports: update manager/admin"
ON public.reports
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));