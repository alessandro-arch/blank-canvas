
-- Table for AI analysis results
CREATE TABLE public.monthly_report_ai (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id uuid NOT NULL REFERENCES public.monthly_reports(id) ON DELETE CASCADE,
  summary_text text,
  risks_text text,
  inconsistencies_text text,
  indicators jsonb DEFAULT '{}'::jsonb,
  merit_opinion_draft text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  model_version text
);

-- RLS
ALTER TABLE public.monthly_report_ai ENABLE ROW LEVEL SECURITY;

-- Managers/admins can read AI results for their org reports
CREATE POLICY "monthly_report_ai_select_org" ON public.monthly_report_ai
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM monthly_reports mr
    WHERE mr.id = monthly_report_ai.report_id
    AND (has_role(auth.uid(), 'admin'::app_role)
         OR (has_role(auth.uid(), 'manager'::app_role)
             AND mr.organization_id IN (SELECT get_user_organizations())))
  )
);

-- No direct insert/update/delete from client - only via edge function with service role
CREATE INDEX idx_monthly_report_ai_report_id ON public.monthly_report_ai(report_id);
