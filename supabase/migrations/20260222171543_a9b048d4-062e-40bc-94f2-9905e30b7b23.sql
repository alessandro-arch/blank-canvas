-- Add unique constraint on profiles.user_id for ON CONFLICT support
ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- Now insert missing profile
INSERT INTO profiles (user_id, full_name, origin)
VALUES ('4e1c3113-dbce-4e25-936d-a4011a8dfe2a', 'Suporte Innovago', 'org_invite')
ON CONFLICT (user_id) DO UPDATE SET full_name = 'Suporte Innovago', updated_at = now();

INSERT INTO profiles_sensitive (user_id)
VALUES ('4e1c3113-dbce-4e25-936d-a4011a8dfe2a')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_roles (user_id, role)
VALUES ('4e1c3113-dbce-4e25-936d-a4011a8dfe2a', 'manager')
ON CONFLICT (user_id, role) DO NOTHING;