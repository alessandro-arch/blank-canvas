-- Drop existing policies to replace with new ones
DROP POLICY IF EXISTS "Scholars can view their own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Managers can view all enrollments" ON public.enrollments;

-- Force RLS to prevent any bypass
ALTER TABLE public.enrollments FORCE ROW LEVEL SECURITY;

-- 1) Bolsista: Só pode ver os próprios vínculos
CREATE POLICY "Enrollments: select own"
ON public.enrollments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 2) Gestor e Admin: Leem todos os vínculos
CREATE POLICY "Enrollments: select manager/admin"
ON public.enrollments
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));