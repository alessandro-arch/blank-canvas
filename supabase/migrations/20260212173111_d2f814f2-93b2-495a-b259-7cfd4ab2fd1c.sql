-- =============================================
-- FIX: Convert ALL restrictive SELECT policies to PERMISSIVE across all tables
-- =============================================

-- === PROFILES ===
DROP POLICY IF EXISTS "Profiles: select own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: select admin" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: select manager org-scoped" ON public.profiles;
DROP POLICY IF EXISTS "deny_anon_select" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: insert own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: update own non-sensitive" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

CREATE POLICY "Profiles: select own" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Profiles: select admin" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Profiles: select manager org-scoped" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role) AND organization_id IN (SELECT get_user_organizations()));
CREATE POLICY "deny_anon_select" ON public.profiles FOR SELECT TO anon USING (false);
CREATE POLICY "Profiles: insert own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Profiles: update own non-sensitive" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- === PROJECTS ===
DROP POLICY IF EXISTS "Managers can view all projects" ON public.projects;
DROP POLICY IF EXISTS "Scholars can view their projects" ON public.projects;
DROP POLICY IF EXISTS "Managers can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Managers can update projects" ON public.projects;
DROP POLICY IF EXISTS "Managers can delete projects" ON public.projects;

CREATE POLICY "Managers can view all projects" ON public.projects FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Scholars can view their projects" ON public.projects FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM enrollments WHERE enrollments.project_id = projects.id AND enrollments.user_id = auth.uid()));
CREATE POLICY "Managers can insert projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Managers can update projects" ON public.projects FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Managers can delete projects" ON public.projects FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- === PAYMENTS ===
DROP POLICY IF EXISTS "Managers can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Scholars can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Managers can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Managers can update payments" ON public.payments;

CREATE POLICY "Managers can view all payments" ON public.payments FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Scholars can view their own payments" ON public.payments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Managers can insert payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Managers can update payments" ON public.payments FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- === REPORTS ===
DROP POLICY IF EXISTS "Reports: select own" ON public.reports;
DROP POLICY IF EXISTS "Reports: select admin" ON public.reports;
DROP POLICY IF EXISTS "Reports: select manager org-scoped" ON public.reports;
DROP POLICY IF EXISTS "Reports: insert own" ON public.reports;
DROP POLICY IF EXISTS "Reports: update admin" ON public.reports;
DROP POLICY IF EXISTS "Reports: update manager org-scoped" ON public.reports;
DROP POLICY IF EXISTS "deny_anon_select" ON public.reports;

CREATE POLICY "Reports: select own" ON public.reports FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Reports: select admin" ON public.reports FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Reports: select manager org-scoped" ON public.reports FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role) AND EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = reports.user_id AND p.organization_id IN (SELECT get_user_organizations())));
CREATE POLICY "Reports: insert own" ON public.reports FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Reports: update admin" ON public.reports FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Reports: update manager org-scoped" ON public.reports FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'manager'::app_role) AND EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = reports.user_id AND p.organization_id IN (SELECT get_user_organizations())));
CREATE POLICY "deny_anon_select" ON public.reports FOR SELECT TO anon USING (false);

-- === BANK_ACCOUNTS ===
DROP POLICY IF EXISTS "bank_accounts_select_own" ON public.bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_select_admin" ON public.bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_select_manager_org_scoped" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can view their own bank account" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can insert their own bank account" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can update their own bank account when not locked" ON public.bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_insert_own" ON public.bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_update_own_unvalidated" ON public.bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_update_admin" ON public.bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_update_manager_org_scoped" ON public.bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_delete_own_unvalidated" ON public.bank_accounts;
DROP POLICY IF EXISTS "deny_anon_select" ON public.bank_accounts;

CREATE POLICY "bank_accounts_select_own" ON public.bank_accounts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "bank_accounts_select_admin" ON public.bank_accounts FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "bank_accounts_select_manager_org_scoped" ON public.bank_accounts FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role) AND user_can_access_profile_by_org(user_id));
CREATE POLICY "bank_accounts_insert_own" ON public.bank_accounts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "bank_accounts_update_own_unvalidated" ON public.bank_accounts FOR UPDATE TO authenticated USING (user_id = auth.uid() AND COALESCE(locked_for_edit, false) = false AND COALESCE(validation_status, 'pending'::bank_validation_status) = ANY (ARRAY['pending'::bank_validation_status, 'returned'::bank_validation_status])) WITH CHECK (user_id = auth.uid() AND COALESCE(locked_for_edit, false) = false AND COALESCE(validation_status, 'pending'::bank_validation_status) = ANY (ARRAY['pending'::bank_validation_status, 'returned'::bank_validation_status]));
CREATE POLICY "bank_accounts_update_admin" ON public.bank_accounts FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "bank_accounts_update_manager_org_scoped" ON public.bank_accounts FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'manager'::app_role) AND user_can_access_profile_by_org(user_id)) WITH CHECK (has_role(auth.uid(), 'manager'::app_role) AND user_can_access_profile_by_org(user_id));
CREATE POLICY "bank_accounts_delete_own_unvalidated" ON public.bank_accounts FOR DELETE TO authenticated USING (user_id = auth.uid() AND COALESCE(validation_status, 'pending'::bank_validation_status) = ANY (ARRAY['pending'::bank_validation_status, 'returned'::bank_validation_status]));
CREATE POLICY "deny_anon_select" ON public.bank_accounts FOR SELECT TO anon USING (false);

-- === ENROLLMENTS ===
DROP POLICY IF EXISTS "Enrollments: select own" ON public.enrollments;
DROP POLICY IF EXISTS "Enrollments: select manager/admin" ON public.enrollments;
DROP POLICY IF EXISTS "Managers can insert enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Managers can update enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Managers can delete enrollments" ON public.enrollments;

CREATE POLICY "Enrollments: select own" ON public.enrollments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Enrollments: select manager/admin" ON public.enrollments FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Managers can insert enrollments" ON public.enrollments FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Managers can update enrollments" ON public.enrollments FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Managers can delete enrollments" ON public.enrollments FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- === THEMATIC_PROJECTS ===
DROP POLICY IF EXISTS "Managers can view all thematic projects" ON public.thematic_projects;
DROP POLICY IF EXISTS "Scholars can view their thematic project" ON public.thematic_projects;
DROP POLICY IF EXISTS "Managers can insert thematic projects" ON public.thematic_projects;
DROP POLICY IF EXISTS "Managers can update thematic projects" ON public.thematic_projects;
DROP POLICY IF EXISTS "Admins can delete thematic projects" ON public.thematic_projects;

CREATE POLICY "Managers can view all thematic projects" ON public.thematic_projects FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Scholars can view their thematic project" ON public.thematic_projects FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM enrollments e JOIN projects p ON e.project_id = p.id WHERE p.thematic_project_id = thematic_projects.id AND e.user_id = auth.uid()));
CREATE POLICY "Managers can insert thematic projects" ON public.thematic_projects FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Managers can update thematic projects" ON public.thematic_projects FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete thematic projects" ON public.thematic_projects FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- === NOTIFICATIONS ===
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Managers can insert notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Managers can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- === MESSAGES ===
DROP POLICY IF EXISTS "messages_select_own" ON public.messages;
DROP POLICY IF EXISTS "messages_select_admin_all" ON public.messages;
DROP POLICY IF EXISTS "messages_select_manager_org" ON public.messages;
DROP POLICY IF EXISTS "messages_deny_anon" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_manager" ON public.messages;
DROP POLICY IF EXISTS "messages_update_own" ON public.messages;
DROP POLICY IF EXISTS "messages_update_admin_all" ON public.messages;
DROP POLICY IF EXISTS "messages_update_manager_org" ON public.messages;

CREATE POLICY "messages_select_own" ON public.messages FOR SELECT TO authenticated USING (recipient_id = auth.uid());
CREATE POLICY "messages_select_admin_all" ON public.messages FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "messages_select_manager_org" ON public.messages FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role) AND organization_id IN (SELECT get_user_organizations()));
CREATE POLICY "messages_deny_anon" ON public.messages FOR SELECT TO anon USING (false);
CREATE POLICY "messages_insert_manager" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "messages_update_own" ON public.messages FOR UPDATE TO authenticated USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());
CREATE POLICY "messages_update_admin_all" ON public.messages FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "messages_update_manager_org" ON public.messages FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'manager'::app_role) AND organization_id IN (SELECT get_user_organizations())) WITH CHECK (has_role(auth.uid(), 'manager'::app_role) AND organization_id IN (SELECT get_user_organizations()));

-- === ORGANIZATIONS ===
DROP POLICY IF EXISTS "org_select_members" ON public.organizations;
DROP POLICY IF EXISTS "org_insert_admin" ON public.organizations;
DROP POLICY IF EXISTS "org_update_owner" ON public.organizations;
DROP POLICY IF EXISTS "org_delete_superadmin" ON public.organizations;

CREATE POLICY "org_select_members" ON public.organizations FOR SELECT TO authenticated USING (user_has_org_access(id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "org_insert_admin" ON public.organizations FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "org_update_owner" ON public.organizations FOR UPDATE TO authenticated USING (user_org_role(id) = 'owner' OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "org_delete_superadmin" ON public.organizations FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- === ORGANIZATION_MEMBERS ===
DROP POLICY IF EXISTS "org_members_select" ON public.organization_members;
DROP POLICY IF EXISTS "org_members_insert_owner" ON public.organization_members;
DROP POLICY IF EXISTS "org_members_update_owner" ON public.organization_members;
DROP POLICY IF EXISTS "org_members_delete_owner" ON public.organization_members;

CREATE POLICY "org_members_select" ON public.organization_members FOR SELECT TO authenticated USING (user_has_org_access(organization_id) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "org_members_insert_owner" ON public.organization_members FOR INSERT TO authenticated WITH CHECK (user_org_role(organization_id) = ANY (ARRAY['owner', 'admin']) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "org_members_update_owner" ON public.organization_members FOR UPDATE TO authenticated USING (user_org_role(organization_id) = ANY (ARRAY['owner', 'admin']) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "org_members_delete_owner" ON public.organization_members FOR DELETE TO authenticated USING (user_org_role(organization_id) = ANY (ARRAY['owner', 'admin']) OR has_role(auth.uid(), 'admin'::app_role));

-- === INVITE_CODES ===
DROP POLICY IF EXISTS "invite_codes_select_manager_admin" ON public.invite_codes;
DROP POLICY IF EXISTS "invite_codes_insert_manager_admin" ON public.invite_codes;
DROP POLICY IF EXISTS "invite_codes_update_manager_admin" ON public.invite_codes;
DROP POLICY IF EXISTS "invite_codes_delete_admin_only" ON public.invite_codes;

CREATE POLICY "invite_codes_select_manager_admin" ON public.invite_codes FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "invite_codes_insert_manager_admin" ON public.invite_codes FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "invite_codes_update_manager_admin" ON public.invite_codes FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "invite_codes_delete_admin_only" ON public.invite_codes FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- === INVITE_CODE_USES ===
DROP POLICY IF EXISTS "invite_code_uses_select_manager_admin" ON public.invite_code_uses;
CREATE POLICY "invite_code_uses_select_manager_admin" ON public.invite_code_uses FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- === GRANT_TERMS ===
DROP POLICY IF EXISTS "grant_terms_select_own" ON public.grant_terms;
DROP POLICY IF EXISTS "grant_terms_select_manager" ON public.grant_terms;
DROP POLICY IF EXISTS "grant_terms_insert_manager" ON public.grant_terms;
DROP POLICY IF EXISTS "grant_terms_update_manager" ON public.grant_terms;
DROP POLICY IF EXISTS "grant_terms_delete_admin" ON public.grant_terms;

CREATE POLICY "grant_terms_select_own" ON public.grant_terms FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "grant_terms_select_manager" ON public.grant_terms FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "grant_terms_insert_manager" ON public.grant_terms FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "grant_terms_update_manager" ON public.grant_terms FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "grant_terms_delete_admin" ON public.grant_terms FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- === INSTITUTIONAL_DOCUMENTS ===
DROP POLICY IF EXISTS "All authenticated users can view institutional documents" ON public.institutional_documents;
DROP POLICY IF EXISTS "Managers can insert institutional documents" ON public.institutional_documents;
DROP POLICY IF EXISTS "Managers can update institutional documents" ON public.institutional_documents;
DROP POLICY IF EXISTS "Admins can delete institutional documents" ON public.institutional_documents;

CREATE POLICY "All authenticated users can view institutional documents" ON public.institutional_documents FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Managers can insert institutional documents" ON public.institutional_documents FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Managers can update institutional documents" ON public.institutional_documents FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete institutional documents" ON public.institutional_documents FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- === MESSAGE_TEMPLATES ===
DROP POLICY IF EXISTS "templates_select_manager" ON public.message_templates;
DROP POLICY IF EXISTS "templates_insert_manager" ON public.message_templates;
DROP POLICY IF EXISTS "templates_update_manager" ON public.message_templates;
DROP POLICY IF EXISTS "templates_delete_manager" ON public.message_templates;

CREATE POLICY "templates_select_manager" ON public.message_templates FOR SELECT TO authenticated USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "templates_insert_manager" ON public.message_templates FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "templates_update_manager" ON public.message_templates FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "templates_delete_manager" ON public.message_templates FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- === AUDIT_LOGS ===
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "deny_anon_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "deny_anon_select" ON public.audit_logs;

CREATE POLICY "Admins can view all audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "deny_anon_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "deny_anon_select" ON public.audit_logs FOR SELECT TO anon USING (false);

-- === PROFILES_SENSITIVE ===
DROP POLICY IF EXISTS "Users can view their own sensitive data" ON public.profiles_sensitive;
DROP POLICY IF EXISTS "Admins can view sensitive data" ON public.profiles_sensitive;
DROP POLICY IF EXISTS "Users can insert their own sensitive data" ON public.profiles_sensitive;
DROP POLICY IF EXISTS "Users can update their own sensitive data" ON public.profiles_sensitive;
DROP POLICY IF EXISTS "Admins can update sensitive data" ON public.profiles_sensitive;

CREATE POLICY "Users can view their own sensitive data" ON public.profiles_sensitive FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view sensitive data" ON public.profiles_sensitive FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert their own sensitive data" ON public.profiles_sensitive FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own sensitive data" ON public.profiles_sensitive FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can update sensitive data" ON public.profiles_sensitive FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));