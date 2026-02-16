
-- Add storage policies for managers and admins to access all reports
DROP POLICY IF EXISTS "Managers can view all reports" ON storage.objects;
CREATE POLICY "Managers can view all reports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'reports'
  AND (
    has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Managers can upload reports (for replace file feature)
DROP POLICY IF EXISTS "Managers can upload reports" ON storage.objects;
CREATE POLICY "Managers can upload reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reports'
  AND (
    has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Managers can update/replace report files
DROP POLICY IF EXISTS "Managers can update reports" ON storage.objects;
CREATE POLICY "Managers can update reports"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'reports'
  AND (
    has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);
