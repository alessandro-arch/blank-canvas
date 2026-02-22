
-- RLS policies for auditor role: SELECT only on org-scoped tables

-- 1. thematic_projects
CREATE POLICY "Auditor can view org thematic_projects"
ON thematic_projects FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = thematic_projects.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'auditor'
      AND om.is_active = true
  )
);

-- 2. projects (via thematic_projects)
CREATE POLICY "Auditor can view org projects"
ON projects FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN thematic_projects tp ON tp.organization_id = om.organization_id
    WHERE tp.id = projects.thematic_project_id
      AND om.user_id = auth.uid()
      AND om.role = 'auditor'
      AND om.is_active = true
  )
);

-- 3. enrollments (via projects -> thematic_projects)
CREATE POLICY "Auditor can view org enrollments"
ON enrollments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN thematic_projects tp ON tp.organization_id = om.organization_id
    JOIN projects p ON p.thematic_project_id = tp.id
    WHERE p.id = enrollments.project_id
      AND om.user_id = auth.uid()
      AND om.role = 'auditor'
      AND om.is_active = true
  )
);

-- 4. payments (via enrollments -> projects -> thematic_projects)
CREATE POLICY "Auditor can view org payments"
ON payments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN thematic_projects tp ON tp.organization_id = om.organization_id
    JOIN projects p ON p.thematic_project_id = tp.id
    JOIN enrollments e ON e.project_id = p.id
    WHERE e.id = payments.enrollment_id
      AND om.user_id = auth.uid()
      AND om.role = 'auditor'
      AND om.is_active = true
  )
);

-- 5. monthly_reports (has organization_id directly)
CREATE POLICY "Auditor can view org monthly_reports"
ON monthly_reports FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = monthly_reports.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'auditor'
      AND om.is_active = true
  )
);

-- 6. reports (via monthly_reports or enrollments)
CREATE POLICY "Auditor can view org reports"
ON reports FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN thematic_projects tp ON tp.organization_id = om.organization_id
    JOIN projects p ON p.thematic_project_id = tp.id
    JOIN enrollments e ON e.project_id = p.id
    WHERE e.user_id = reports.user_id
      AND om.user_id = auth.uid()
      AND om.role = 'auditor'
      AND om.is_active = true
  )
);
