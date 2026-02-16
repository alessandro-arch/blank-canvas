-- Fix: scholar storage policies use wrong foldername index
-- The path is {user_id}/{reference_month}/file.pdf, so user_id is at index [1]

DROP POLICY IF EXISTS "Scholars can view own reports" ON storage.objects;
CREATE POLICY "Scholars can view own reports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'reports'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Scholars can upload own reports" ON storage.objects;
CREATE POLICY "Scholars can upload own reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reports'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);