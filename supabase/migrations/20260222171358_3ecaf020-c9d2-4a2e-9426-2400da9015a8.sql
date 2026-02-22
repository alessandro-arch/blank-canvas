-- Update profile name
UPDATE profiles SET full_name = 'Contato InnovaGO', updated_at = now() WHERE user_id = 'fb452d28-a94a-4940-bbfb-64aa1ea8d162';

-- Update auth metadata
UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || '{"full_name": "Contato InnovaGO"}'::jsonb WHERE id = 'fb452d28-a94a-4940-bbfb-64aa1ea8d162';