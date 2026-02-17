-- Fix: payments RLS - admin can also view all payments (policy currently only allows manager)
-- The existing policy "Managers can view all payments" uses has_role(..., 'manager') but not 'admin'
-- We need to update it to also include admin OR create a separate admin policy

CREATE POLICY "Admins can view all payments"
ON public.payments
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
