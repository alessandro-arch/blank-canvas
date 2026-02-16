
-- ============================================
-- FASE 1+2+3: Membros Admin + Convites + RLS
-- ============================================

-- 1. Add missing columns to organization_members
ALTER TABLE public.organization_members 
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{}'::jsonb;

-- Add unique constraint if not exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_members_user_org 
  ON public.organization_members (user_id, organization_id);

-- 2. Add organization_id to audit_logs
ALTER TABLE public.audit_logs 
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

-- 3. Create org_invites table
CREATE TABLE IF NOT EXISTS public.org_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'manager')),
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.org_invites ENABLE ROW LEVEL SECURITY;

-- RLS: org_invites - only org admins/owners or system admins
CREATE POLICY "org_invites_select_org_admin"
  ON public.org_invites FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR user_org_role(organization_id) IN ('admin', 'owner')
  );

CREATE POLICY "org_invites_insert_org_admin"
  ON public.org_invites FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR user_org_role(organization_id) IN ('admin', 'owner')
  );

CREATE POLICY "org_invites_update_org_admin"
  ON public.org_invites FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR user_org_role(organization_id) IN ('admin', 'owner')
  );

-- 4. Security definer: create_org_invite
CREATE OR REPLACE FUNCTION public.create_org_invite(
  p_organization_id uuid,
  p_email text,
  p_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_token text;
  v_invite_id uuid;
BEGIN
  v_caller_role := user_org_role(p_organization_id);
  
  IF v_caller_role IS NULL AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: você não é membro desta organização';
  END IF;
  
  IF v_caller_role NOT IN ('admin', 'owner') AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: apenas admins podem convidar membros';
  END IF;
  
  IF p_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Role inválida: deve ser admin ou manager';
  END IF;
  
  -- Check if already active member
  IF EXISTS (
    SELECT 1 FROM organization_members om
    JOIN auth.users u ON u.id = om.user_id
    WHERE om.organization_id = p_organization_id
      AND u.email = p_email
      AND om.is_active = true
  ) THEN
    RAISE EXCEPTION 'Este usuário já é membro ativo desta organização';
  END IF;
  
  -- Check pending invite
  IF EXISTS (
    SELECT 1 FROM org_invites
    WHERE organization_id = p_organization_id
      AND email = p_email
      AND accepted_at IS NULL
      AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Já existe um convite pendente para este e-mail';
  END IF;
  
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  
  INSERT INTO org_invites (organization_id, email, role, token, created_by)
  VALUES (p_organization_id, p_email, p_role, v_token, auth.uid())
  RETURNING id INTO v_invite_id;
  
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, organization_id, details, user_email)
  VALUES (
    auth.uid(), 'invite_created', 'org_invite', v_invite_id,
    p_organization_id,
    jsonb_build_object('email', p_email, 'role', p_role),
    (SELECT email FROM auth.users WHERE id = auth.uid())
  );
  
  RETURN jsonb_build_object('invite_id', v_invite_id, 'token', v_token);
END;
$$;

-- 5. Security definer: accept_org_invite
CREATE OR REPLACE FUNCTION public.accept_org_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite record;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  SELECT * INTO v_invite FROM org_invites WHERE token = p_token FOR UPDATE;
  
  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Convite não encontrado';
  END IF;
  IF v_invite.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Este convite já foi utilizado';
  END IF;
  IF v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'Este convite expirou';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id AND email = v_invite.email) THEN
    RAISE EXCEPTION 'Este convite foi enviado para outro e-mail';
  END IF;
  
  INSERT INTO organization_members (user_id, organization_id, role, is_active)
  VALUES (v_user_id, v_invite.organization_id, v_invite.role, true)
  ON CONFLICT (user_id, organization_id)
  DO UPDATE SET role = v_invite.role, is_active = true, updated_at = now();
  
  UPDATE org_invites SET accepted_at = now() WHERE id = v_invite.id;
  
  IF v_invite.role IN ('admin', 'manager') THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (v_user_id, 'manager'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, organization_id, details, user_email)
  VALUES (
    v_user_id, 'invite_accepted', 'org_invite', v_invite.id,
    v_invite.organization_id,
    jsonb_build_object('role', v_invite.role),
    v_invite.email
  );
  
  RETURN jsonb_build_object('success', true, 'organization_id', v_invite.organization_id, 'role', v_invite.role);
END;
$$;

-- 6. Security definer: get_invite_details (no auth required)
CREATE OR REPLACE FUNCTION public.get_invite_details(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite record;
BEGIN
  SELECT i.*, o.name as org_name
  INTO v_invite
  FROM org_invites i
  JOIN organizations o ON o.id = i.organization_id
  WHERE i.token = p_token;
  
  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Convite não encontrado');
  END IF;
  IF v_invite.accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Este convite já foi utilizado');
  END IF;
  IF v_invite.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Este convite expirou');
  END IF;
  
  RETURN jsonb_build_object(
    'valid', true,
    'email', v_invite.email,
    'role', v_invite.role,
    'organization_name', v_invite.org_name,
    'expires_at', v_invite.expires_at
  );
END;
$$;
