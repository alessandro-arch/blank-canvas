
-- Drop the existing scholar policy and create a simpler one
DROP POLICY IF EXISTS "Scholars can view their own payments" ON public.payments;

CREATE POLICY "Scholars can view their own payments"
ON public.payments
FOR SELECT
USING (auth.uid() = user_id);
