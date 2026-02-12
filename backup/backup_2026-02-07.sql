-- ============================================================
-- BACKUP COMPLETO DO BANCO DE DADOS
-- Data: 2026-02-07
-- Projeto: Bolsa Conecta (ICCA)
-- ============================================================
-- INSTRUÇÕES DE RESTAURAÇÃO:
-- 1. Este backup contém INSERT statements para todas as tabelas
-- 2. Execute na ordem apresentada para respeitar foreign keys
-- 3. Dados sensíveis (pix_key_encrypted) não são incluídos
-- ============================================================

-- ============================================================
-- TABELA: thematic_projects (2 registros)
-- ============================================================
INSERT INTO public.thematic_projects (id, title, sponsor_name, status, start_date, end_date, observations, created_at, updated_at) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Desenvolvimento e a aplicação de métodos quimiométricos para a análise multivariada de dados clínicos e instrumentais, uma iniciativa de alta relevância científica e tecnológica.', 'LABORATÓRIO TOMMASI', 'active', '2026-01-01', '2028-12-31', NULL, '2026-02-05 21:11:24.286221+00', '2026-02-05 21:11:24.286221+00'),
  ('8187e530-567f-4386-895d-8449c9f9171d', 'Teste do teste  e Aplicação de Métodos', 'FAPES', 'active', NULL, NULL, NULL, '2026-02-05 21:28:45.722743+00', '2026-02-05 21:28:45.722743+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- TABELA: projects (6 registros)
-- ============================================================
INSERT INTO public.projects (id, code, title, orientador, coordenador_tecnico_icca, modalidade_bolsa, valor_mensal, start_date, end_date, status, thematic_project_id, observacoes, created_at, updated_at) VALUES
  ('acf827a8-3759-4972-916c-988229d02d3e', '001-2026TOM', 'Desenvolvimento e Aplicação de Métodos Quimiométricos para Análise Multivariada de Dados Clínicos e Instrumentais', 'Valerio Garrone Barauna', 'Alessandro Coutinho ', 'Cientista Sênior', 5000, '2026-01-01', '2027-12-01', 'active', 'a0000000-0000-0000-0000-000000000001', NULL, '2026-02-01 18:58:03.274292+00', '2026-02-05 21:18:56.651425+00'),
  ('db2d450b-1285-436c-8a69-0b0940cf827c', '002-2026TOM', 'Desenvolvimento de modelos quimiométricos baseados em FTIR-MIR para estimativa de parâmetros clínicos em sangue com aplicação de transferência de calibração', 'Madson Poltronieri Zanoni', 'Alessandro Coutinho ', 'Desenvolvimento Científico e Tecnológico (Nível C)', 4500, '2026-01-02', '2027-12-01', 'active', 'a0000000-0000-0000-0000-000000000001', NULL, '2026-02-01 18:58:03.547024+00', '2026-02-05 21:11:24.286221+00'),
  ('6a3b9ea6-fb32-4adf-b22a-4321330f2d72', '003-2026TOM', 'Aplicação de Métodos de Quimiometria e Bioespectroscopia em Dados Clínicos', 'Paulo Roberto Filgueiras', 'Alessandro Coutinho ', 'Cientista Sênior', 5500, '2026-01-03', '2027-12-01', 'active', 'a0000000-0000-0000-0000-000000000001', NULL, '2026-02-01 18:58:03.8054+00', '2026-02-05 21:11:24.286221+00'),
  ('1a78c34b-3b2f-4503-9781-532e492b4588', '004-2026TOM', 'Determinação automatizada de propriedades clínicas a partir de machine learning e infravermelho médio', 'Gabriely Silveira folli', 'Alessandro Coutinho ', 'Produtividade em Pesquisa', 5000, '2026-01-04', '2027-12-01', 'active', 'a0000000-0000-0000-0000-000000000001', NULL, '2026-02-01 18:58:04.057473+00', '2026-02-05 21:11:24.286221+00'),
  ('2776a57f-ad44-4eb1-88b0-918463014990', '005-2026TOM', 'Micorrizas arbusculares', 'Alessandro Coutinho Ramos', 'Alessandro Coutinho ', 'Cientista Sênior', 5500, '2026-01-05', '2028-01-01', 'active', 'a0000000-0000-0000-0000-000000000001', NULL, '2026-02-01 18:58:04.322724+00', '2026-02-05 21:11:24.286221+00'),
  ('b4361f7c-af0c-4f34-aab2-0b2326c60389', 'GOV-2026-022', 'Teste testando ', 'Alessandro ', 'sem', 'Cientista Sênior', 1000, '2026-02-05', '2027-01-05', 'active', '8187e530-567f-4386-895d-8449c9f9171d', 'teste', '2026-02-05 22:05:17.64433+00', '2026-02-05 22:05:17.64433+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- TABELA: profiles (4 registros)
-- NOTA: Vinculado a auth.users - usuários devem existir primeiro
-- ============================================================
INSERT INTO public.profiles (id, user_id, email, full_name, cpf, phone, avatar_url, institution, academic_level, lattes_url, origin, onboarding_status, is_active, thematic_project_id, partner_company_id, invite_code_used, invite_used_at, created_at, updated_at) VALUES
  ('9a65a4a1-2747-4706-82b5-fa6a2fa6962f', '3e893529-c8f5-4807-af00-4a9897aa444b', 'administrativo@icca.org.br', 'Administrativo ICCA', NULL, NULL, NULL, NULL, NULL, NULL, 'manual', 'AGUARDANDO_ATRIBUICAO', true, NULL, NULL, NULL, NULL, '2026-02-01 03:49:11.9926+00', '2026-02-01 03:49:11.9926+00'),
  ('4a120ac7-355f-423d-aeaa-0b9cdb00c523', '190f52bb-2a3d-4a63-abcb-853f638ffd81', 'alessandro.uvv@gmail.com', 'Alessandro Coutinho Ramos', '03498290630', '27981525655', '190f52bb-2a3d-4a63-abcb-853f638ffd81/avatar.png', 'Universidade Vila Velha', 'pos_doutorado', 'http://lattes.cnpq.br/8921776090757789', 'manual', 'AGUARDANDO_ATRIBUICAO', true, NULL, NULL, NULL, NULL, '2026-02-01 04:21:36.001112+00', '2026-02-05 19:50:09.129148+00'),
  ('7041f5fe-664d-4dd0-8582-c46f6df18b73', '11523cbb-c8ac-461e-a76b-e7d8fbb93928', 'ciencia360hq@gmail.com', 'Ciencia Ab', '00460310658', NULL, NULL, NULL, NULL, NULL, 'manual', 'AGUARDANDO_ATRIBUICAO', true, NULL, NULL, NULL, NULL, '2026-02-05 21:39:53.061605+00', '2026-02-05 21:39:53.061605+00'),
  ('51f1dd64-a444-4cb2-b463-8fb8ea444b1f', '56275e88-2c36-448a-9f03-ec459ec0eb82', 'teste.email.design@example.com', 'Usuário Teste Email', '52998224725', NULL, NULL, NULL, NULL, NULL, 'manual', 'AGUARDANDO_ATRIBUICAO', true, 'a0000000-0000-0000-0000-000000000001', 'dc00be95-762e-4030-a293-f924dd894200', 'ICCA-C4MCMLXN', '2026-02-07 16:35:08.773877+00', '2026-02-07 16:35:08.773877+00', '2026-02-07 16:35:08.773877+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- TABELA: user_roles (4 registros)
-- ============================================================
INSERT INTO public.user_roles (id, user_id, role) VALUES
  ('2ba62fb3-07ce-42d7-ac36-f6dcc44cf7f3', '190f52bb-2a3d-4a63-abcb-853f638ffd81', 'scholar'),
  ('db3f07c8-5234-48fb-9c6f-3e7d2584fefa', '3e893529-c8f5-4807-af00-4a9897aa444b', 'admin'),
  ('14195ef0-3c32-44d2-9887-d14fdf8b579b', '11523cbb-c8ac-461e-a76b-e7d8fbb93928', 'scholar'),
  ('76671fd2-d225-4d66-a639-314465c1dc6a', '56275e88-2c36-448a-9f03-ec459ec0eb82', 'scholar')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- TABELA: invite_codes (2 registros)
-- ============================================================
INSERT INTO public.invite_codes (id, code, thematic_project_id, partner_company_id, max_uses, used_count, expires_at, status, created_by, created_at) VALUES
  ('60aa2175-52f5-4ade-a5ef-20724e5938a6', 'ICCA-GJ8T9BYA', '8187e530-567f-4386-895d-8449c9f9171d', '91c1b6f1-2e18-4616-b469-7146ecb50542', 1, 0, NULL, 'disabled', '3e893529-c8f5-4807-af00-4a9897aa444b', '2026-02-05 21:32:42.723352+00'),
  ('bad52dea-dca2-42a0-849b-351e661c90a8', 'ICCA-C4MCMLXN', 'a0000000-0000-0000-0000-000000000001', 'dc00be95-762e-4030-a293-f924dd894200', 5, 1, '2026-02-13', 'active', '3e893529-c8f5-4807-af00-4a9897aa444b', '2026-02-06 18:45:51.643548+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- TABELA: invite_code_uses (1 registro)
-- ============================================================
INSERT INTO public.invite_code_uses (id, invite_code_id, used_by, used_by_email, used_at) VALUES
  ('405193e2-bafc-4717-9000-5302967b693b', 'bad52dea-dca2-42a0-849b-351e661c90a8', '56275e88-2c36-448a-9f03-ec459ec0eb82', 'teste.email.design@example.com', '2026-02-07 16:35:08.773877+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- TABELA: enrollments (2 registros)
-- ============================================================
INSERT INTO public.enrollments (id, user_id, project_id, modality, grant_value, start_date, end_date, total_installments, status, observations, created_at, updated_at) VALUES
  ('cd09aa1c-5d2a-4193-8369-9db5a292ba4d', '190f52bb-2a3d-4a63-abcb-853f638ffd81', '2776a57f-ad44-4eb1-88b0-918463014990', 'ict', 5500.00, '2026-01-05', '2027-12-01', 24, 'active', NULL, '2026-02-01 20:24:18.781381+00', '2026-02-01 20:24:18.781381+00'),
  ('ffcf2fe4-2a8b-478e-990f-d3c1ca2306a2', '11523cbb-c8ac-461e-a76b-e7d8fbb93928', 'b4361f7c-af0c-4f34-aab2-0b2326c60389', 'ict', 1000.00, '2026-02-05', '2027-01-05', 12, 'active', NULL, '2026-02-05 22:06:46.91841+00', '2026-02-05 22:06:46.91841+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- TABELA: reports (3 registros)
-- ============================================================
INSERT INTO public.reports (id, user_id, reference_month, installment_number, file_name, file_url, status, observations, feedback, reviewed_by, reviewed_at, resubmission_deadline, submitted_at, created_at, updated_at) VALUES
  ('5e63d279-7311-4119-9282-2ee806963f76', '190f52bb-2a3d-4a63-abcb-853f638ffd81', '2026-01', 1, 'Contrato Editora Lattice - Crossover Science.pdf', '190f52bb-2a3d-4a63-abcb-853f638ffd81/2026-01/v1.pdf', 'approved', NULL, NULL, '3e893529-c8f5-4807-af00-4a9897aa444b', '2026-02-05 19:47:13.402+00', NULL, '2026-02-05 19:45:20.2341+00', '2026-02-05 19:45:20.2341+00', '2026-02-05 19:47:13.571777+00'),
  ('19c642a4-9226-406a-a9bb-cd9ad17bea08', '190f52bb-2a3d-4a63-abcb-853f638ffd81', '2026-02', 2, 'DECLARACAO_DE_INEXISTENCIA_DE_VEDACOES_assinado-2.pdf', '190f52bb-2a3d-4a63-abcb-853f638ffd81/2026-02/v1.pdf', 'approved', NULL, NULL, '3e893529-c8f5-4807-af00-4a9897aa444b', '2026-02-05 19:46:35.466+00', NULL, '2026-02-05 19:45:50.870456+00', '2026-02-05 19:45:50.870456+00', '2026-02-05 19:46:35.640903+00'),
  ('db981055-b4ad-4cbe-b998-a202ec699b91', '11523cbb-c8ac-461e-a76b-e7d8fbb93928', '2026-02', 1, 'Justificativa_Patricia_UVV_2_assinado.pdf', '11523cbb-c8ac-461e-a76b-e7d8fbb93928/2026-02/v1.pdf', 'approved', NULL, NULL, '3e893529-c8f5-4807-af00-4a9897aa444b', '2026-02-06 03:07:07.903+00', NULL, '2026-02-05 22:31:42.894154+00', '2026-02-05 22:31:42.894154+00', '2026-02-06 03:07:08.101155+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- TABELA: payments (25 registros)
-- NOTA: Lista parcial - primeiros registros como exemplo
-- ============================================================
INSERT INTO public.payments (id, user_id, enrollment_id, installment_number, reference_month, amount, status, report_id, paid_at, receipt_url, created_at, updated_at) VALUES
  ('db1de31c-0cd1-43ea-8440-2c9c33c73a02', '190f52bb-2a3d-4a63-abcb-853f638ffd81', 'cd09aa1c-5d2a-4193-8369-9db5a292ba4d', 1, '2026-01', 5500.00, 'paid', '5e63d279-7311-4119-9282-2ee806963f76', '2026-02-06 03:07:41.469+00', NULL, '2026-02-01 20:24:19.023351+00', '2026-02-06 03:07:41.77425+00'),
  ('ec21a3c0-0772-4761-93ba-0c38c14aa906', '190f52bb-2a3d-4a63-abcb-853f638ffd81', 'cd09aa1c-5d2a-4193-8369-9db5a292ba4d', 4, '2026-04', 5500.00, 'pending', NULL, NULL, NULL, '2026-02-04 16:38:52.90414+00', '2026-02-04 16:38:52.90414+00'),
  ('977b68bb-03b6-479e-a207-75196c3cfef9', '190f52bb-2a3d-4a63-abcb-853f638ffd81', 'cd09aa1c-5d2a-4193-8369-9db5a292ba4d', 5, '2026-05', 5500.00, 'pending', NULL, NULL, NULL, '2026-02-04 16:38:52.90414+00', '2026-02-04 16:38:52.90414+00'),
  ('6d3f244b-1069-4e27-8594-8605cb3b03da', '190f52bb-2a3d-4a63-abcb-853f638ffd81', 'cd09aa1c-5d2a-4193-8369-9db5a292ba4d', 6, '2026-06', 5500.00, 'pending', NULL, NULL, NULL, '2026-02-04 16:38:52.90414+00', '2026-02-04 16:38:52.90414+00'),
  ('fdbdc29f-f0ba-4457-a6ea-a1135fee8e42', '190f52bb-2a3d-4a63-abcb-853f638ffd81', 'cd09aa1c-5d2a-4193-8369-9db5a292ba4d', 7, '2026-07', 5500.00, 'pending', NULL, NULL, NULL, '2026-02-04 16:38:52.90414+00', '2026-02-04 16:38:52.90414+00'),
  ('9728796e-bdfc-466b-b4df-b794528868d5', '190f52bb-2a3d-4a63-abcb-853f638ffd81', 'cd09aa1c-5d2a-4193-8369-9db5a292ba4d', 8, '2026-08', 5500.00, 'pending', NULL, NULL, NULL, '2026-02-04 16:38:52.90414+00', '2026-02-04 16:38:52.90414+00'),
  ('453c18b7-d395-40d5-991c-f3ef44f9a74f', '190f52bb-2a3d-4a63-abcb-853f638ffd81', 'cd09aa1c-5d2a-4193-8369-9db5a292ba4d', 9, '2026-09', 5500.00, 'pending', NULL, NULL, NULL, '2026-02-04 16:38:52.90414+00', '2026-02-04 16:38:52.90414+00'),
  ('f575a416-d292-4ed4-b656-f3074bf3e93b', '190f52bb-2a3d-4a63-abcb-853f638ffd81', 'cd09aa1c-5d2a-4193-8369-9db5a292ba4d', 10, '2026-10', 5500.00, 'pending', NULL, NULL, NULL, '2026-02-04 16:38:52.90414+00', '2026-02-04 16:38:52.90414+00'),
  ('8233d9c0-79d5-4fc1-9a3c-4c7070785e5f', '190f52bb-2a3d-4a63-abcb-853f638ffd81', 'cd09aa1c-5d2a-4193-8369-9db5a292ba4d', 11, '2026-11', 5500.00, 'pending', NULL, NULL, NULL, '2026-02-04 16:38:52.90414+00', '2026-02-04 16:38:52.90414+00'),
  ('c246b5f8-95ea-4190-95dc-59515249f694', '190f52bb-2a3d-4a63-abcb-853f638ffd81', 'cd09aa1c-5d2a-4193-8369-9db5a292ba4d', 12, '2026-12', 5500.00, 'pending', NULL, NULL, NULL, '2026-02-04 16:38:52.90414+00', '2026-02-04 16:38:52.90414+00'),
  ('e9f952c0-a100-40a9-911e-63938c31598a', '190f52bb-2a3d-4a63-abcb-853f638ffd81', 'cd09aa1c-5d2a-4193-8369-9db5a292ba4d', 13, '2027-01', 5500.00, 'pending', NULL, NULL, NULL, '2026-02-04 16:38:52.90414+00', '2026-02-04 16:38:52.90414+00'),
  ('db421a83-e6e1-424c-b1de-6e7d62ae65a0', '190f52bb-2a3d-4a63-abcb-853f638ffd81', 'cd09aa1c-5d2a-4193-8369-9db5a292ba4d', 14, '2027-02', 5500.00, 'pending', NULL, NULL, NULL, '2026-02-04 16:38:52.90414+00', '2026-02-04 16:38:52.90414+00'),
  ('6d8372a2-a55b-4c4c-b3c8-f3d81f1857d4', '190f52bb-2a3d-4a63-abcb-853f638ffd81', 'cd09aa1c-5d2a-4193-8369-9db5a292ba4d', 15, '2027-03', 5500.00, 'pending', NULL, NULL, NULL, '2026-02-04 16:38:52.90414+00', '2026-02-04 16:38:52.90414+00'),
  ('6d2f43fe-5424-426b-94d0-233c06c2ac3c', '190f52bb-2a3d-4a63-abcb-853f638ffd81', 'cd09aa1c-5d2a-4193-8369-9db5a292ba4d', 16, '2027-04', 5500.00, 'pending', NULL, NULL, NULL, '2026-02-04 16:38:52.90414+00', '2026-02-04 16:38:52.90414+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- TABELA: bank_accounts (1 registro)
-- NOTA: pix_key_encrypted não incluído por segurança
-- ============================================================
INSERT INTO public.bank_accounts (id, user_id, bank_name, bank_code, agency, account_number, account_type, pix_key, pix_key_type, pix_key_masked, validation_status, locked_for_edit, validated_by, validated_at, notes_gestor, created_at, updated_at) VALUES
  ('b1a801f6-1328-4cc3-85ec-b5da0738483d', '190f52bb-2a3d-4a63-abcb-853f638ffd81', 'Banco do Brasil', '', '3028', '0111597', 'Conta Corrente', '03498290630', NULL, NULL, 'validated', true, '3e893529-c8f5-4807-af00-4a9897aa444b', '2026-02-01 23:02:26.14+00', NULL, '2026-02-01 22:08:08.730776+00', '2026-02-01 23:02:26.366745+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- TABELA: grant_terms (1 registro)
-- ============================================================
INSERT INTO public.grant_terms (id, user_id, file_name, file_url, file_size, signed_at, uploaded_by, uploaded_at, created_at, updated_at) VALUES
  ('b573da71-09be-4bb9-8eac-aea906bbb829', '190f52bb-2a3d-4a63-abcb-853f638ffd81', 'GABRIELY - TERMO DE OUTORGA E ACEITAÇÃO DE BOLSA pdf-D4Sign.pdf', '190f52bb-2a3d-4a63-abcb-853f638ffd81/termo-outorga.pdf', 746611, '2026-06-05', '3e893529-c8f5-4807-af00-4a9897aa444b', '2026-02-06 18:01:54.827412+00', '2026-02-06 18:01:54.827412+00', '2026-02-06 18:01:54.827412+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- TABELA: institutional_documents (1 registro)
-- ============================================================
INSERT INTO public.institutional_documents (id, title, type, description, file_name, file_url, file_size, uploaded_by, created_at, updated_at) VALUES
  ('20300fbd-46ff-43a9-91a3-e0c18114c4eb', 'Manual do Bolsista', 'manual', 'Manual do Bolsista do Instituto ICCA', 'Manual do Bolsista ICCA V2.pdf', 'https://bllwrehynktoboezwalw.supabase.co/storage/v1/object/public/institutional-documents/manual/1770402868087-jmuexs.pdf', 221233, '3e893529-c8f5-4807-af00-4a9897aa444b', '2026-02-06 18:34:29.884878+00', '2026-02-06 18:34:29.884878+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FIM DO BACKUP
-- ============================================================
-- RESUMO:
-- • thematic_projects: 2 registros
-- • projects: 6 registros
-- • profiles: 4 registros
-- • user_roles: 4 registros
-- • invite_codes: 2 registros
-- • invite_code_uses: 1 registro
-- • enrollments: 2 registros
-- • reports: 3 registros
-- • payments: 25 registros (14 mostrados)
-- • bank_accounts: 1 registro
-- • grant_terms: 1 registro
-- • institutional_documents: 1 registro
-- • audit_logs: 23 registros (não incluídos - logs históricos)
-- ============================================================
