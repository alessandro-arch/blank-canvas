-- Insert member
INSERT INTO organization_members (user_id, organization_id, role, is_active)
VALUES ('fb452d28-a94a-4940-bbfb-64aa1ea8d162', 'a1111111-1111-1111-1111-111111111111', 'manager', true)
ON CONFLICT (user_id, organization_id) DO UPDATE SET role = 'manager', is_active = true, updated_at = now();

-- Mark invite as accepted
UPDATE organization_invites 
SET status = 'accepted', accepted_by = 'fb452d28-a94a-4940-bbfb-64aa1ea8d162', accepted_at = now()
WHERE id = 'a938303e-54db-4e42-9530-21471929e8ee';

-- Add manager role
INSERT INTO user_roles (user_id, role) 
VALUES ('fb452d28-a94a-4940-bbfb-64aa1ea8d162', 'manager')
ON CONFLICT (user_id, role) DO NOTHING;