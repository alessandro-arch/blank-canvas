-- Drop existing storage policies for reports bucket if they exist
DROP POLICY IF EXISTS "Scholars can upload their own reports" ON storage.objects;
DROP POLICY IF EXISTS "Scholars can view their own reports" ON storage.objects;
DROP POLICY IF EXISTS "Managers can view all reports" ON storage.objects;

-- Create policy: Scholars can upload their own reports
-- Path format: {user_id}/{reference_month}/v{version}.pdf
CREATE POLICY "Scholars can upload their own reports"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'reports' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy: Scholars can view their own reports
CREATE POLICY "Scholars can view their own reports"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'reports' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy: Managers and Admins can view all reports
CREATE POLICY "Managers can view all reports"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'reports' 
  AND (
    public.has_role(auth.uid(), 'manager'::app_role) 
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Create policy: Scholars can update their own reports (for upsert operations)
CREATE POLICY "Scholars can update their own reports"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'reports' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);