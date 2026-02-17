
-- =============================================
-- ORG-SCOPING: thematic_projects for managers
-- =============================================
-- Drop old permissive manager SELECT
DROP POLICY IF EXISTS "Managers can view all thematic projects" ON public.thematic_projects;
-- New org-scoped manager SELECT
CREATE POLICY "Managers can view org thematic projects"
  ON public.thematic_projects FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'manager'::app_role)
      AND organization_id IN (SELECT get_user_organizations())
    )
  );

-- Drop old manager UPDATE
DROP POLICY IF EXISTS "Managers can update thematic projects" ON public.thematic_projects;
CREATE POLICY "Managers can update org thematic projects"
  ON public.thematic_projects FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'manager'::app_role)
      AND organization_id IN (SELECT get_user_organizations())
    )
  );

-- Drop old manager INSERT
DROP POLICY IF EXISTS "Managers can insert thematic projects" ON public.thematic_projects;
CREATE POLICY "Managers can insert org thematic projects"
  ON public.thematic_projects FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'manager'::app_role)
      AND organization_id IN (SELECT get_user_organizations())
    )
  );

-- =============================================
-- ORG-SCOPING: projects for managers (via thematic_projects)
-- =============================================
DROP POLICY IF EXISTS "Managers can view all projects" ON public.projects;
CREATE POLICY "Managers can view org projects"
  ON public.projects FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'manager'::app_role)
      AND EXISTS (
        SELECT 1 FROM thematic_projects tp
        WHERE tp.id = projects.thematic_project_id
          AND tp.organization_id IN (SELECT get_user_organizations())
      )
    )
  );

DROP POLICY IF EXISTS "Managers can update projects" ON public.projects;
CREATE POLICY "Managers can update org projects"
  ON public.projects FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'manager'::app_role)
      AND EXISTS (
        SELECT 1 FROM thematic_projects tp
        WHERE tp.id = projects.thematic_project_id
          AND tp.organization_id IN (SELECT get_user_organizations())
      )
    )
  );

DROP POLICY IF EXISTS "Managers can insert projects" ON public.projects;
CREATE POLICY "Managers can insert org projects"
  ON public.projects FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'manager'::app_role)
      AND EXISTS (
        SELECT 1 FROM thematic_projects tp
        WHERE tp.id = thematic_project_id
          AND tp.organization_id IN (SELECT get_user_organizations())
      )
    )
  );

-- =============================================
-- ORG-SCOPING: enrollments for managers (via projects -> thematic_projects)
-- =============================================
DROP POLICY IF EXISTS "Enrollments: select manager/admin" ON public.enrollments;
CREATE POLICY "Enrollments: select org-scoped"
  ON public.enrollments FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'manager'::app_role)
      AND EXISTS (
        SELECT 1 FROM projects p
        JOIN thematic_projects tp ON tp.id = p.thematic_project_id
        WHERE p.id = enrollments.project_id
          AND tp.organization_id IN (SELECT get_user_organizations())
      )
    )
  );

DROP POLICY IF EXISTS "Managers can insert enrollments" ON public.enrollments;
CREATE POLICY "Managers can insert org enrollments"
  ON public.enrollments FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'manager'::app_role)
      AND EXISTS (
        SELECT 1 FROM projects p
        JOIN thematic_projects tp ON tp.id = p.thematic_project_id
        WHERE p.id = project_id
          AND tp.organization_id IN (SELECT get_user_organizations())
      )
    )
  );

DROP POLICY IF EXISTS "Managers can update enrollments" ON public.enrollments;
CREATE POLICY "Managers can update org enrollments"
  ON public.enrollments FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'manager'::app_role)
      AND EXISTS (
        SELECT 1 FROM projects p
        JOIN thematic_projects tp ON tp.id = p.thematic_project_id
        WHERE p.id = enrollments.project_id
          AND tp.organization_id IN (SELECT get_user_organizations())
      )
    )
  );

-- =============================================
-- ORG-SCOPING: payments for managers (via enrollments -> projects -> thematic_projects)
-- =============================================
DROP POLICY IF EXISTS "Managers can view all payments" ON public.payments;
CREATE POLICY "Managers can view org payments"
  ON public.payments FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'manager'::app_role)
      AND EXISTS (
        SELECT 1 FROM enrollments e
        JOIN projects p ON p.id = e.project_id
        JOIN thematic_projects tp ON tp.id = p.thematic_project_id
        WHERE e.id = payments.enrollment_id
          AND tp.organization_id IN (SELECT get_user_organizations())
      )
    )
  );

DROP POLICY IF EXISTS "Managers can insert payments" ON public.payments;
CREATE POLICY "Managers can insert org payments"
  ON public.payments FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'manager'::app_role)
      AND EXISTS (
        SELECT 1 FROM enrollments e
        JOIN projects p ON p.id = e.project_id
        JOIN thematic_projects tp ON tp.id = p.thematic_project_id
        WHERE e.id = enrollment_id
          AND tp.organization_id IN (SELECT get_user_organizations())
      )
    )
  );

DROP POLICY IF EXISTS "Managers can update payments" ON public.payments;
CREATE POLICY "Managers can update org payments"
  ON public.payments FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'manager'::app_role)
      AND EXISTS (
        SELECT 1 FROM enrollments e
        JOIN projects p ON p.id = e.project_id
        JOIN thematic_projects tp ON tp.id = p.thematic_project_id
        WHERE e.id = payments.enrollment_id
          AND tp.organization_id IN (SELECT get_user_organizations())
      )
    )
  );

-- =============================================
-- ORG-SCOPING: invite_codes for managers
-- =============================================
DROP POLICY IF EXISTS "invite_codes_select_manager_admin" ON public.invite_codes;
CREATE POLICY "invite_codes_select_org_scoped"
  ON public.invite_codes FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'manager'::app_role)
      AND organization_id IN (SELECT get_user_organizations())
    )
  );

DROP POLICY IF EXISTS "invite_codes_insert_manager_admin" ON public.invite_codes;
CREATE POLICY "invite_codes_insert_org_scoped"
  ON public.invite_codes FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'manager'::app_role)
      AND organization_id IN (SELECT get_user_organizations())
    )
  );

DROP POLICY IF EXISTS "invite_codes_update_manager_admin" ON public.invite_codes;
CREATE POLICY "invite_codes_update_org_scoped"
  ON public.invite_codes FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'manager'::app_role)
      AND organization_id IN (SELECT get_user_organizations())
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_role(auth.uid(), 'manager'::app_role)
      AND organization_id IN (SELECT get_user_organizations())
    )
  );
