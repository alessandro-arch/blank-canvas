
-- 1. Auditor can SELECT profiles within their organization
CREATE POLICY "Profiles: select auditor org-scoped"
ON public.profiles FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'auditor'::app_role)
  AND organization_id IN (SELECT get_user_organizations())
);

-- 2. Auditor can view report_attachments for reports in their organization
CREATE POLICY "Auditor can view org report_attachments"
ON public.report_attachments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM monthly_reports mr
    JOIN organization_members om
      ON om.organization_id = mr.organization_id
    WHERE mr.id = report_attachments.report_id
      AND om.user_id = auth.uid()
      AND om.role = 'auditor'
      AND om.is_active = true
  )
);

-- 3. Auditor can view payment receipts in storage
CREATE POLICY "Auditors can view payment receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-receipts'
  AND has_role(auth.uid(), 'auditor'::app_role)
);
