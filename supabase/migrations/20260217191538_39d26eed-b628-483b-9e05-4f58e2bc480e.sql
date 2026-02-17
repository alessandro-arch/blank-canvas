
-- =============================================
-- FIX: Convert ALL select policies from RESTRICTIVE to PERMISSIVE
-- on tables: projects, enrollments, payments, reports, thematic_projects, profiles
-- Root cause: RESTRICTIVE = AND logic (all must pass), PERMISSIVE = OR logic (any can pass)
-- =============================================

-- ── PROJECTS ──
DROP POLICY IF EXISTS "Managers can view org projects" ON public.projects;
DROP POLICY IF EXISTS "Scholars can view their projects" ON public.projects;
DROP POLICY IF EXISTS "Managers can insert org projects" ON public.projects;
DROP POLICY IF EXISTS "Managers can update org projects" ON public.projects;
DROP POLICY IF EXISTS "Managers can delete projects" ON public.projects;

CREATE POLICY "Managers can view org projects" ON public.projects
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (has_role(auth.uid(), 'manager'::app_role) AND project_belongs_to_user_org(id))
  );

CREATE POLICY "Scholars can view their projects" ON public.projects
  FOR SELECT TO authenticated USING (
    user_has_enrollment_in_project(id)
  );

CREATE POLICY "Managers can insert org projects" ON public.projects
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (has_role(auth.uid(), 'manager'::app_role) AND EXISTS (
      SELECT 1 FROM thematic_projects tp
      WHERE tp.id = projects.thematic_project_id
      AND tp.organization_id IN (SELECT get_user_organizations())
    ))
  );

CREATE POLICY "Managers can update org projects" ON public.projects
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (has_role(auth.uid(), 'manager'::app_role) AND project_belongs_to_user_org(id))
  );

CREATE POLICY "Managers can delete projects" ON public.projects
  FOR DELETE TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- ── ENROLLMENTS ──
DROP POLICY IF EXISTS "Enrollments: select org-scoped" ON public.enrollments;
DROP POLICY IF EXISTS "Enrollments: select own" ON public.enrollments;
DROP POLICY IF EXISTS "Managers can insert org enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Managers can update org enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Managers can delete enrollments" ON public.enrollments;

CREATE POLICY "Enrollments: select org-scoped" ON public.enrollments
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (has_role(auth.uid(), 'manager'::app_role) AND project_belongs_to_user_org(project_id))
  );

CREATE POLICY "Enrollments: select own" ON public.enrollments
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
  );

CREATE POLICY "Managers can insert org enrollments" ON public.enrollments
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (has_role(auth.uid(), 'manager'::app_role) AND project_belongs_to_user_org(project_id))
  );

CREATE POLICY "Managers can update org enrollments" ON public.enrollments
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (has_role(auth.uid(), 'manager'::app_role) AND project_belongs_to_user_org(project_id))
  );

CREATE POLICY "Managers can delete enrollments" ON public.enrollments
  FOR DELETE TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- ── PAYMENTS ──
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Managers can view org payments" ON public.payments;
DROP POLICY IF EXISTS "Scholars can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Managers can insert org payments" ON public.payments;
DROP POLICY IF EXISTS "Managers can update org payments" ON public.payments;

CREATE POLICY "Admins can view all payments" ON public.payments
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Managers can view org payments" ON public.payments
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'manager'::app_role) AND enrollment_in_user_org(enrollment_id)
  );

CREATE POLICY "Scholars can view their own payments" ON public.payments
  FOR SELECT TO authenticated USING (
    auth.uid() = user_id
  );

CREATE POLICY "Managers can insert org payments" ON public.payments
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (has_role(auth.uid(), 'manager'::app_role) AND enrollment_in_user_org(enrollment_id))
  );

CREATE POLICY "Managers can update org payments" ON public.payments
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (has_role(auth.uid(), 'manager'::app_role) AND enrollment_in_user_org(enrollment_id))
  );

-- ── REPORTS ──
DROP POLICY IF EXISTS "deny_anon_select" ON public.reports;
DROP POLICY IF EXISTS "Reports: select admin" ON public.reports;
DROP POLICY IF EXISTS "Reports: select manager org-scoped" ON public.reports;
DROP POLICY IF EXISTS "Reports: select own" ON public.reports;
DROP POLICY IF EXISTS "Reports: insert own" ON public.reports;
DROP POLICY IF EXISTS "Reports: update admin" ON public.reports;
DROP POLICY IF EXISTS "Reports: update manager org-scoped" ON public.reports;

CREATE POLICY "deny_anon_select" ON public.reports
  FOR SELECT TO anon USING (false);

CREATE POLICY "Reports: select admin" ON public.reports
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Reports: select manager org-scoped" ON public.reports
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'manager'::app_role) AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = reports.user_id
      AND p.organization_id IN (SELECT get_user_organizations())
    )
  );

CREATE POLICY "Reports: select own" ON public.reports
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
  );

CREATE POLICY "Reports: insert own" ON public.reports
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY "Reports: update admin" ON public.reports
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Reports: update manager org-scoped" ON public.reports
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(), 'manager'::app_role) AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = reports.user_id
      AND p.organization_id IN (SELECT get_user_organizations())
    )
  );

-- ── THEMATIC_PROJECTS ──
DROP POLICY IF EXISTS "Managers can view org thematic projects" ON public.thematic_projects;
DROP POLICY IF EXISTS "Scholars can view their thematic project" ON public.thematic_projects;
DROP POLICY IF EXISTS "Managers can insert org thematic projects" ON public.thematic_projects;
DROP POLICY IF EXISTS "Managers can update org thematic projects" ON public.thematic_projects;
DROP POLICY IF EXISTS "Admins can delete thematic projects" ON public.thematic_projects;

CREATE POLICY "Managers can view org thematic projects" ON public.thematic_projects
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (has_role(auth.uid(), 'manager'::app_role) AND organization_id IN (SELECT get_user_organizations()))
  );

CREATE POLICY "Scholars can view their thematic project" ON public.thematic_projects
  FOR SELECT TO authenticated USING (
    user_enrolled_in_thematic_project(id)
  );

CREATE POLICY "Managers can insert org thematic projects" ON public.thematic_projects
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR (has_role(auth.uid(), 'manager'::app_role) AND organization_id IN (SELECT get_user_organizations()))
  );

CREATE POLICY "Managers can update org thematic projects" ON public.thematic_projects
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (has_role(auth.uid(), 'manager'::app_role) AND organization_id IN (SELECT get_user_organizations()))
  );

CREATE POLICY "Admins can delete thematic projects" ON public.thematic_projects
  FOR DELETE TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- ── PROFILES ──
DROP POLICY IF EXISTS "deny_anon_select" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: select admin" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: select manager org-scoped" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: select own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: insert own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: update own non-sensitive" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

CREATE POLICY "deny_anon_select" ON public.profiles
  FOR SELECT TO anon USING (false);

CREATE POLICY "Profiles: select admin" ON public.profiles
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Profiles: select manager org-scoped" ON public.profiles
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'manager'::app_role)
    AND organization_id IN (SELECT get_user_organizations())
  );

CREATE POLICY "Profiles: select own" ON public.profiles
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
  );

CREATE POLICY "Profiles: insert own" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY "Profiles: update own non-sensitive" ON public.profiles
  FOR UPDATE TO authenticated USING (
    user_id = auth.uid()
  ) WITH CHECK (
    user_id = auth.uid()
  );

CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- ── USER_ROLES (fix deny_anon_select to target anon only) ──
DROP POLICY IF EXISTS "deny_anon_select" ON public.user_roles;
DROP POLICY IF EXISTS "Roles: select admin" ON public.user_roles;
DROP POLICY IF EXISTS "Roles: select manager" ON public.user_roles;
DROP POLICY IF EXISTS "Roles: select own" ON public.user_roles;
DROP POLICY IF EXISTS "Roles: insert admin only" ON public.user_roles;
DROP POLICY IF EXISTS "Roles: update admin only" ON public.user_roles;
DROP POLICY IF EXISTS "Roles: delete admin only" ON public.user_roles;

CREATE POLICY "deny_anon_select" ON public.user_roles
  FOR SELECT TO anon USING (false);

CREATE POLICY "Roles: select admin" ON public.user_roles
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Roles: select manager" ON public.user_roles
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Roles: select own" ON public.user_roles
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
  );

CREATE POLICY "Roles: insert admin only" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Roles: update admin only" ON public.user_roles
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role)
  ) WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Roles: delete admin only" ON public.user_roles
  FOR DELETE TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- ── AUDIT_LOGS ──
DROP POLICY IF EXISTS "deny_anon_select" ON public.audit_logs;
DROP POLICY IF EXISTS "deny_anon_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;

CREATE POLICY "deny_anon_select" ON public.audit_logs
  FOR SELECT TO anon USING (false);

CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "deny_anon_insert" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() IS NOT NULL
  );
