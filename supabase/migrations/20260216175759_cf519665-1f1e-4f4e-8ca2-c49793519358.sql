-- Add missing unique constraints
ALTER TABLE organization_members ADD CONSTRAINT org_members_user_org_unique UNIQUE (user_id, organization_id);
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_role_unique UNIQUE (user_id, role);