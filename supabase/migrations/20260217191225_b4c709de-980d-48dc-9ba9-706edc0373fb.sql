
-- =============================================================
-- FIX: Infinite recursion between enrollments ↔ projects RLS
-- Root cause: enrollments policy references projects table,
-- projects policy references enrollments table → infinite loop
-- Solution: SECURITY DEFINER functions that bypass RLS
-- =============================================================

-- 1. Helper: check if a project belongs to user's orgs (bypasses projects RLS)
CREATE OR REPLACE FUNCTION public.project_belongs_to_user_org(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM projects p
    JOIN thematic_projects tp ON tp.id = p.thematic_project_id
    WHERE p.id = p_project_id
    AND tp.organization_id IN (SELECT get_user_organizations())
  )
$$;

-- 2. Helper: check if user has enrollment in a project (bypasses enrollments RLS)
CREATE OR REPLACE FUNCTION public.user_has_enrollment_in_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM enrollments
    WHERE project_id = p_project_id
    AND user_id = auth.uid()
  )
$$;

-- 3. Helper: check if enrollment belongs to user's org (bypasses enrollments+projects RLS)
CREATE OR REPLACE FUNCTION public.enrollment_in_user_org(p_enrollment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM enrollments e
    JOIN projects p ON p.id = e.project_id
    JOIN thematic_projects tp ON tp.id = p.thematic_project_id
    WHERE e.id = p_enrollment_id
    AND tp.organization_id IN (SELECT get_user_organizations())
  )
$$;

-- 4. Helper: check if user is enrolled in any project under a thematic project
CREATE OR REPLACE FUNCTION public.user_enrolled_in_thematic_project(p_thematic_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM enrollments e
    JOIN projects p ON p.id = e.project_id
    WHERE p.thematic_project_id = p_thematic_project_id
    AND e.user_id = auth.uid()
  )
$$;

-- =============================================================
-- 5. Rewrite PROJECTS policies using helper functions
-- =============================================================

DROP POLICY IF EXISTS "Scholars can view their projects" ON public.projects;
CREATE POLICY "Scholars can view their projects" ON public.projects
  FOR SELECT USING (user_has_enrollment_in_project(id));

DROP POLICY IF EXISTS "Managers can view org projects" ON public.projects;
CREATE POLICY "Managers can view org projects" ON public.projects
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (has_role(auth.uid(), 'manager'::app_role) AND project_belongs_to_user_org(id))
  );

DROP POLICY IF EXISTS "Managers can update org projects" ON public.projects;
CREATE POLICY "Managers can update org projects" ON public.projects
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (has_role(auth.uid(), 'manager'::app_role) AND project_belongs_to_user_org(id))
  );

DROP POLICY IF EXISTS "Managers can insert org projects" ON public.projects;
CREATE POLICY "Managers can insert org projects" ON public.projects
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (has_role(auth.uid(), 'manager'::app_role) AND (EXISTS (
      SELECT 1 FROM thematic_projects tp 
      WHERE tp.id = projects.thematic_project_id 
      AND tp.organization_id IN (SELECT get_user_organizations())
    )))
  );

-- =============================================================
-- 6. Rewrite ENROLLMENTS policies using helper functions
-- =============================================================

DROP POLICY IF EXISTS "Enrollments: select org-scoped" ON public.enrollments;
CREATE POLICY "Enrollments: select org-scoped" ON public.enrollments
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (has_role(auth.uid(), 'manager'::app_role) AND project_belongs_to_user_org(project_id))
  );

DROP POLICY IF EXISTS "Managers can insert org enrollments" ON public.enrollments;
CREATE POLICY "Managers can insert org enrollments" ON public.enrollments
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (has_role(auth.uid(), 'manager'::app_role) AND project_belongs_to_user_org(project_id))
  );

DROP POLICY IF EXISTS "Managers can update org enrollments" ON public.enrollments;
CREATE POLICY "Managers can update org enrollments" ON public.enrollments
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (has_role(auth.uid(), 'manager'::app_role) AND project_belongs_to_user_org(project_id))
  );

-- =============================================================
-- 7. Rewrite PAYMENTS policies using helper functions
-- =============================================================

DROP POLICY IF EXISTS "Managers can view org payments" ON public.payments;
CREATE POLICY "Managers can view org payments" ON public.payments
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (has_role(auth.uid(), 'manager'::app_role) AND enrollment_in_user_org(enrollment_id))
  );

DROP POLICY IF EXISTS "Managers can insert org payments" ON public.payments;
CREATE POLICY "Managers can insert org payments" ON public.payments
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (has_role(auth.uid(), 'manager'::app_role) AND enrollment_in_user_org(enrollment_id))
  );

DROP POLICY IF EXISTS "Managers can update org payments" ON public.payments;
CREATE POLICY "Managers can update org payments" ON public.payments
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (has_role(auth.uid(), 'manager'::app_role) AND enrollment_in_user_org(enrollment_id))
  );

-- =============================================================
-- 8. Rewrite THEMATIC_PROJECTS scholar policy (also referenced enrollments+projects)
-- =============================================================

DROP POLICY IF EXISTS "Scholars can view their thematic project" ON public.thematic_projects;
CREATE POLICY "Scholars can view their thematic project" ON public.thematic_projects
  FOR SELECT USING (user_enrolled_in_thematic_project(id));
