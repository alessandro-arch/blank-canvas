
-- 1) Pagamentos
DELETE FROM payments WHERE user_id = '190f52bb-2a3d-4a63-abcb-853f638ffd81';

-- 2) Relatórios
DELETE FROM reports WHERE user_id = '190f52bb-2a3d-4a63-abcb-853f638ffd81';

-- 3) Enrollment
DELETE FROM enrollments WHERE user_id = '190f52bb-2a3d-4a63-abcb-853f638ffd81';

-- 4) Termo de outorga
DELETE FROM grant_terms WHERE user_id = '190f52bb-2a3d-4a63-abcb-853f638ffd81';

-- 5) Dados bancários
DELETE FROM bank_accounts WHERE user_id = '190f52bb-2a3d-4a63-abcb-853f638ffd81';

-- 6) Mensagens e notificações
DELETE FROM messages WHERE recipient_id = '190f52bb-2a3d-4a63-abcb-853f638ffd81';
DELETE FROM notifications WHERE user_id = '190f52bb-2a3d-4a63-abcb-853f638ffd81';

-- 7) Membro da organização
DELETE FROM organization_members WHERE user_id = '190f52bb-2a3d-4a63-abcb-853f638ffd81';

-- 8) Perfis
DELETE FROM profiles_sensitive WHERE user_id = '190f52bb-2a3d-4a63-abcb-853f638ffd81';
DELETE FROM profiles WHERE user_id = '190f52bb-2a3d-4a63-abcb-853f638ffd81';

-- 9) Role
DELETE FROM user_roles WHERE user_id = '190f52bb-2a3d-4a63-abcb-853f638ffd81';
