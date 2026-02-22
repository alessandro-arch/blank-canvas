
-- 1. Auditor SELECT on monthly_report_ai_outputs
CREATE POLICY "Auditor can view org ai_outputs"
ON public.monthly_report_ai_outputs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM monthly_reports mr
    JOIN organization_members om
      ON om.organization_id = mr.organization_id
    WHERE mr.id = monthly_report_ai_outputs.report_id
      AND om.user_id = auth.uid()
      AND om.role = 'auditor'
      AND om.is_active = true
  )
);

-- 2. Auditor SELECT on monthly_report_fields
CREATE POLICY "Auditor can view org report_fields"
ON public.monthly_report_fields FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM monthly_reports mr
    JOIN organization_members om
      ON om.organization_id = mr.organization_id
    WHERE mr.id = monthly_report_fields.report_id
      AND om.user_id = auth.uid()
      AND om.role = 'auditor'
      AND om.is_active = true
  )
);

-- 3. Auditor SELECT on monthly_report_documents
CREATE POLICY "Auditor can view org report_documents"
ON public.monthly_report_documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM monthly_reports mr
    JOIN organization_members om
      ON om.organization_id = mr.organization_id
    WHERE mr.id = monthly_report_documents.report_id
      AND om.user_id = auth.uid()
      AND om.role = 'auditor'
      AND om.is_active = true
  )
);

-- 4. Auditor SELECT on monthly_report_versions
CREATE POLICY "Auditor can view org report_versions"
ON public.monthly_report_versions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM monthly_reports mr
    JOIN organization_members om
      ON om.organization_id = mr.organization_id
    WHERE mr.id = monthly_report_versions.report_id
      AND om.user_id = auth.uid()
      AND om.role = 'auditor'
      AND om.is_active = true
  )
);
