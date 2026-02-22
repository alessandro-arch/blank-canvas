
-- Table: report_attachments
CREATE TABLE public.report_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.monthly_reports(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'png', 'jpeg')),
  file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 2097152),
  caption TEXT NOT NULL CHECK (char_length(trim(caption)) > 0 AND char_length(caption) <= 400),
  sha256_hash TEXT,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by report
CREATE INDEX idx_report_attachments_report_id ON public.report_attachments(report_id);

-- Max 5 attachments per report (enforced via trigger)
CREATE OR REPLACE FUNCTION public.check_max_attachments()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM report_attachments
  WHERE report_id = NEW.report_id;
  
  IF v_count >= 5 THEN
    RAISE EXCEPTION 'Máximo de 5 anexos por relatório';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_max_attachments
  BEFORE INSERT ON public.report_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.check_max_attachments();

-- RLS
ALTER TABLE public.report_attachments ENABLE ROW LEVEL SECURITY;

-- Scholar can view/insert own attachments
CREATE POLICY "Scholar can view own attachments"
  ON public.report_attachments FOR SELECT
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM monthly_reports mr
      WHERE mr.id = report_attachments.report_id
      AND mr.organization_id IN (SELECT get_user_organizations())
    )
  );

CREATE POLICY "Scholar can insert own attachments"
  ON public.report_attachments FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM monthly_reports mr
      WHERE mr.id = report_attachments.report_id
      AND mr.beneficiary_user_id = auth.uid()
      AND mr.status IN ('draft', 'returned')
    )
  );

CREATE POLICY "Scholar can delete own draft attachments"
  ON public.report_attachments FOR DELETE
  USING (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM monthly_reports mr
      WHERE mr.id = report_attachments.report_id
      AND mr.beneficiary_user_id = auth.uid()
      AND mr.status IN ('draft', 'returned')
    )
  );

-- Storage bucket for report attachments (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'report-attachments',
  'report-attachments',
  false,
  2097152,
  ARRAY['application/pdf', 'image/png', 'image/jpeg']
);

-- Storage RLS policies
CREATE POLICY "Scholar upload own attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'report-attachments'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Scholar read own attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'report-attachments'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM organization_members
        WHERE user_id = auth.uid()
        AND role IN ('admin', 'manager')
        AND is_active = true
      )
    )
  );

CREATE POLICY "Scholar delete own draft attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'report-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
