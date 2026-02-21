
-- 1) Unique constraint: 1 relatório por (beneficiary + project + period)
-- Prevents duplicates at DB level (currently only enforced by function)
CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_reports_unique_period
  ON public.monthly_reports (beneficiary_user_id, project_id, period_year, period_month);

-- 2) Composite indices for common queries
CREATE INDEX IF NOT EXISTS idx_monthly_reports_org_period
  ON public.monthly_reports (organization_id, period_year, period_month);

CREATE INDEX IF NOT EXISTS idx_monthly_reports_beneficiary_status
  ON public.monthly_reports (beneficiary_user_id, status);

CREATE INDEX IF NOT EXISTS idx_monthly_reports_project_status
  ON public.monthly_reports (project_id, status);

CREATE INDEX IF NOT EXISTS idx_monthly_report_fields_report
  ON public.monthly_report_fields (report_id);

CREATE INDEX IF NOT EXISTS idx_monthly_report_versions_report
  ON public.monthly_report_versions (report_id, version);

CREATE INDEX IF NOT EXISTS idx_monthly_report_documents_report_type
  ON public.monthly_report_documents (report_id, type);
