CREATE POLICY "select_ai_outputs_scholar_decided" ON public.monthly_report_ai_outputs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM monthly_reports mr
      WHERE mr.id = monthly_report_ai_outputs.report_id
        AND mr.beneficiary_user_id = auth.uid()
        AND mr.status IN ('approved', 'returned')
    )
  );