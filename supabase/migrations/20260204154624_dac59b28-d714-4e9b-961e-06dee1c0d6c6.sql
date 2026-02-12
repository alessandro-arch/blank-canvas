-- Add reviewed_by and resubmission_deadline fields to reports table
ALTER TABLE public.reports
ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS resubmission_deadline timestamp with time zone;

-- Add index for faster queries on status and reviewed_by
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reviewed_by ON public.reports(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_reports_user_reference ON public.reports(user_id, reference_month);

-- Add index for payments status
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_enrollment ON public.payments(enrollment_id);

-- Create comments for documentation
COMMENT ON COLUMN public.reports.reviewed_by IS 'ID of the manager who reviewed the report';
COMMENT ON COLUMN public.reports.resubmission_deadline IS 'Deadline for resubmission when report is rejected (5 days from rejection)';