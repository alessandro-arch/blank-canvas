
-- ===========================================
-- FASE 5: Governança e Segurança
-- ===========================================

-- 1. Trigger para validar transições de status válidas
CREATE OR REPLACE FUNCTION public.validate_monthly_report_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Valid transitions:
  -- draft -> submitted
  -- submitted -> under_review, approved, returned
  -- under_review -> approved, returned
  -- returned -> draft (reopen)
  -- approved -> (terminal, no further transitions)
  -- cancelled -> (terminal)

  IF NOT (
    (OLD.status = 'draft' AND NEW.status = 'submitted') OR
    (OLD.status = 'submitted' AND NEW.status IN ('under_review', 'approved', 'returned')) OR
    (OLD.status = 'under_review' AND NEW.status IN ('approved', 'returned')) OR
    (OLD.status = 'returned' AND NEW.status = 'draft') OR
    (OLD.status IN ('draft', 'submitted', 'under_review') AND NEW.status = 'cancelled')
  ) THEN
    RAISE EXCEPTION 'Transição de status inválida: % -> %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_monthly_report_status
  BEFORE UPDATE ON public.monthly_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_monthly_report_status_transition();

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_monthly_reports_beneficiary_project_period 
  ON public.monthly_reports (beneficiary_user_id, project_id, period_year, period_month);

CREATE INDEX IF NOT EXISTS idx_monthly_reports_org_period 
  ON public.monthly_reports (organization_id, period_year, period_month);

CREATE INDEX IF NOT EXISTS idx_monthly_reports_status 
  ON public.monthly_reports (status);

CREATE INDEX IF NOT EXISTS idx_monthly_report_fields_report_id 
  ON public.monthly_report_fields (report_id);

CREATE INDEX IF NOT EXISTS idx_monthly_report_versions_report_id 
  ON public.monthly_report_versions (report_id);

CREATE INDEX IF NOT EXISTS idx_monthly_report_documents_report_id 
  ON public.monthly_report_documents (report_id);

CREATE INDEX IF NOT EXISTS idx_monthly_report_ai_report_id 
  ON public.monthly_report_ai (report_id);
