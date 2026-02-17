
-- Add watermark_text and report_footer_text to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS watermark_text text,
  ADD COLUMN IF NOT EXISTS report_footer_text text;

COMMENT ON COLUMN public.organizations.watermark_text IS 'Texto exibido como marca d''água nos PDFs gerados';
COMMENT ON COLUMN public.organizations.report_footer_text IS 'Texto personalizado no rodapé dos relatórios PDF';
