-- Fix missing profile and role for contato@innovago.app (user fb452d28-a94a-4940-bbfb-64aa1ea8d162)
INSERT INTO public.profiles (user_id, full_name, origin, thematic_project_id, partner_company_id, invite_code_used, invite_used_at)
VALUES (
  'fb452d28-a94a-4940-bbfb-64aa1ea8d162',
  'contato@innovago.app',
  'manual',
  'a0000000-0000-0000-0000-000000000001',
  'dc00be95-762e-4030-a293-f924dd894200',
  'ICCA-C4MCMLXN',
  now()
)
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
VALUES ('fb452d28-a94a-4940-bbfb-64aa1ea8d162', 'scholar')
ON CONFLICT DO NOTHING;

-- Also register the invite code use
INSERT INTO public.invite_code_uses (invite_code_id, used_by, used_by_email)
VALUES ('bad52dea-dca2-42a0-849b-351e661c90a8', 'fb452d28-a94a-4940-bbfb-64aa1ea8d162', 'contato@innovago.app')
ON CONFLICT DO NOTHING;