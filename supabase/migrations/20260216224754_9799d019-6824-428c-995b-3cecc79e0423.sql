-- Allow managers/admins to upload (replace) files in the reports bucket
CREATE POLICY "Managers can upload reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reports'
  AND (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Allow managers/admins to update files in the reports bucket
CREATE POLICY "Managers can update reports"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'reports'
  AND (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);