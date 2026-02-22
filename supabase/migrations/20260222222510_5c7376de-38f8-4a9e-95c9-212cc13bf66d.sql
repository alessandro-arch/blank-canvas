DROP POLICY IF EXISTS "institutions_select" ON public.institutions;
CREATE POLICY "institutions_select" ON public.institutions
  FOR SELECT USING (
    status = 'approved'
    OR submitted_by = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
  );