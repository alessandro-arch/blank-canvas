
-- Add columns for tracking file replacements on reports
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS old_file_url text,
  ADD COLUMN IF NOT EXISTS replaced_at timestamptz,
  ADD COLUMN IF NOT EXISTS replaced_by uuid,
  ADD COLUMN IF NOT EXISTS replace_reason text;

-- Comment for clarity
COMMENT ON COLUMN public.reports.old_file_url IS 'Previous file URL before replacement';
COMMENT ON COLUMN public.reports.replaced_at IS 'Timestamp of last file replacement';
COMMENT ON COLUMN public.reports.replaced_by IS 'User ID who replaced the file';
COMMENT ON COLUMN public.reports.replace_reason IS 'Reason for file replacement';
