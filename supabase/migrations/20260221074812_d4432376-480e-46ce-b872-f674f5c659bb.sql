
ALTER TABLE public.reports 
  ADD COLUMN IF NOT EXISTS reenvio_solicitado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reenvio_solicitado_at timestamptz,
  ADD COLUMN IF NOT EXISTS reenvio_solicitado_by uuid,
  ADD COLUMN IF NOT EXISTS monthly_report_id uuid REFERENCES public.monthly_reports(id);

CREATE INDEX IF NOT EXISTS idx_reports_reenvio 
  ON public.reports (user_id, reenvio_solicitado) 
  WHERE reenvio_solicitado = true;
