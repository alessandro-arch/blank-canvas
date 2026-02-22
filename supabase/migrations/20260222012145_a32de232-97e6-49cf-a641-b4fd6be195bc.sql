
-- Create monthly_report_ai_outputs table
CREATE TABLE public.monthly_report_ai_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.monthly_reports(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  payload jsonb NOT NULL,
  model text,
  prompt_version text DEFAULT 'v1',
  generated_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX idx_monthly_report_ai_outputs_report ON public.monthly_report_ai_outputs(report_id);
CREATE INDEX idx_monthly_report_ai_outputs_org ON public.monthly_report_ai_outputs(organization_id);

-- RLS
ALTER TABLE public.monthly_report_ai_outputs ENABLE ROW LEVEL SECURITY;

-- SELECT: gestors/admins can see their org's outputs
CREATE POLICY "select_ai_outputs_org_scoped" ON public.monthly_report_ai_outputs
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'manager'::app_role)
      AND organization_id IN (SELECT get_user_organizations())
    )
  );

-- No INSERT/UPDATE/DELETE policies - only service_role can write
