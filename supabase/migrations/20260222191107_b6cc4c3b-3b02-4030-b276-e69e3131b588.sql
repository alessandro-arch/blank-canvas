CREATE POLICY "Auditors can view project docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documentos-projetos'
  AND public.has_role(auth.uid(), 'auditor'::public.app_role)
);