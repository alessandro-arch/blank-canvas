
-- ============================================
-- FASE 2: Segurança + organization_invites
-- ============================================

-- 1. Helper SECURITY DEFINER functions (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid()
      AND organization_id = p_org_id
      AND role = 'admin'
      AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin_or_manager(p_org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = auth.uid()
      AND organization_id = p_org_id
      AND role IN ('admin', 'manager')
      AND is_active = true
  )
$$;

-- 2. Update existing helper functions to respect is_active
CREATE OR REPLACE FUNCTION public.user_has_org_access(p_org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_org_id
      AND user_id = auth.uid()
      AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.user_org_role(p_org_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM organization_members
  WHERE organization_id = p_org_id
    AND user_id = auth.uid()
    AND is_active = true
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_user_organizations()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT organization_id FROM organization_members
  WHERE user_id = auth.uid()
    AND is_active = true
$$;

-- 3. Migrate existing role values
UPDATE public.organization_members SET role = 'admin' WHERE role = 'owner';
UPDATE public.organization_members SET role = 'beneficiary' WHERE role NOT IN ('admin', 'manager', 'reviewer', 'beneficiary');

-- 4. Add CHECK constraint on role
ALTER TABLE public.organization_members DROP CONSTRAINT IF EXISTS org_members_role_check;
ALTER TABLE public.organization_members
  ADD CONSTRAINT org_members_role_check
  CHECK (role IN ('admin', 'manager', 'reviewer', 'beneficiary'));

-- 5. Drop old organization_members RLS policies
DROP POLICY IF EXISTS "org_members_select" ON public.organization_members;
DROP POLICY IF EXISTS "org_members_insert_owner" ON public.organization_members;
DROP POLICY IF EXISTS "org_members_update_owner" ON public.organization_members;
DROP POLICY IF EXISTS "org_members_delete_owner" ON public.organization_members;

-- 6. New RLS policies for organization_members
-- SELECT: active admin/manager of the org, system admin, or own record
CREATE POLICY "org_members_select_v2"
ON public.organization_members FOR SELECT
USING (
  user_id = auth.uid()
  OR is_org_admin_or_manager(organization_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- INSERT: system admin only (normal flow via accept_org_invite SECURITY DEFINER)
CREATE POLICY "org_members_insert_v2"
ON public.organization_members FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

-- UPDATE: org admin or system admin
CREATE POLICY "org_members_update_v2"
ON public.organization_members FOR UPDATE
USING (
  is_org_admin(organization_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- DELETE: blocked (use is_active=false)
CREATE POLICY "org_members_delete_blocked"
ON public.organization_members FOR DELETE
USING (false);

-- 7. Update organizations policy (owner -> admin)
DROP POLICY IF EXISTS "org_update_owner" ON public.organizations;
CREATE POLICY "org_update_admin"
ON public.organizations FOR UPDATE
USING (
  is_org_admin(id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 8. Drop old org_invites and related functions
DROP FUNCTION IF EXISTS public.create_org_invite(uuid, text, text);
DROP FUNCTION IF EXISTS public.accept_org_invite(text);
DROP FUNCTION IF EXISTS public.get_invite_details(text);
DROP TABLE IF EXISTS public.org_invites CASCADE;

-- 9. Create organization_invites table
CREATE TABLE public.organization_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'manager', 'reviewer', 'beneficiary')),
  token text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_by uuid NULL,
  accepted_at timestamptz NULL
);

ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

-- 10. RLS for organization_invites (admin only)
CREATE POLICY "org_invites_select_admin"
ON public.organization_invites FOR SELECT
USING (
  is_org_admin(organization_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "org_invites_insert_admin"
ON public.organization_invites FOR INSERT
WITH CHECK (
  is_org_admin(organization_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "org_invites_update_admin"
ON public.organization_invites FOR UPDATE
USING (
  is_org_admin(organization_id)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "org_invites_delete_blocked"
ON public.organization_invites FOR DELETE
USING (false);

-- 11. create_org_invite function (with expiration param)
CREATE OR REPLACE FUNCTION public.create_org_invite(
  p_organization_id uuid,
  p_email text,
  p_role text,
  p_expires_days integer DEFAULT 7
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_token text;
  v_invite_id uuid;
BEGIN
  IF NOT is_org_admin(p_organization_id) AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Acesso negado: apenas admins podem convidar membros';
  END IF;

  IF p_role NOT IN ('admin', 'manager', 'reviewer', 'beneficiary') THEN
    RAISE EXCEPTION 'Role inválida';
  END IF;

  -- Only admin can invite admin
  IF p_role = 'admin' AND NOT is_org_admin(p_organization_id) AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Somente admins podem convidar outros admins';
  END IF;

  -- Check existing active member
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
    SELECT 1 FROM organization_invites
    WHERE organization_id = p_organization_id
      AND invited_email = p_email
      AND status = 'pending'
      AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Já existe um convite pendente para este e-mail';
  END IF;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  INSERT INTO organization_invites (organization_id, invited_email, role, token, expires_at, created_by)
  VALUES (p_organization_id, p_email, p_role, v_token, now() + make_interval(days => p_expires_days), auth.uid())
  RETURNING id INTO v_invite_id;

  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, organization_id, details, user_email)
  VALUES (
    auth.uid(), 'invite_created', 'organization_invite', v_invite_id,
    p_organization_id,
    jsonb_build_object('email', p_email, 'role', p_role, 'expires_days', p_expires_days),
    (SELECT email FROM auth.users WHERE id = auth.uid())
  );

  RETURN jsonb_build_object('invite_id', v_invite_id, 'token', v_token);
END;
$$;

-- 12. accept_org_invite function
CREATE OR REPLACE FUNCTION public.accept_org_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invite record;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT * INTO v_invite FROM organization_invites WHERE token = p_token FOR UPDATE;

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Convite não encontrado';
  END IF;
  IF v_invite.status != 'pending' THEN
    RAISE EXCEPTION 'Este convite não está mais pendente (status: %)', v_invite.status;
  END IF;
  IF v_invite.expires_at < now() THEN
    UPDATE organization_invites SET status = 'expired' WHERE id = v_invite.id;
    RAISE EXCEPTION 'Este convite expirou';
  END IF;

  -- Verify email matches
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id AND email = v_invite.invited_email) THEN
    RAISE EXCEPTION 'Este convite foi enviado para outro e-mail';
  END IF;

  -- Anti-elevation: if role=admin, verify creator is still active admin
  IF v_invite.role = 'admin' THEN
    IF NOT EXISTS (
      SELECT 1 FROM organization_members
      WHERE user_id = v_invite.created_by
        AND organization_id = v_invite.organization_id
        AND role = 'admin'
        AND is_active = true
    ) AND NOT has_role(v_invite.created_by, 'admin'::app_role) THEN
      RAISE EXCEPTION 'O criador deste convite não tem mais permissão de admin';
    END IF;
  END IF;

  -- Upsert membership
  INSERT INTO organization_members (user_id, organization_id, role, is_active)
  VALUES (v_user_id, v_invite.organization_id, v_invite.role, true)
  ON CONFLICT (user_id, organization_id)
  DO UPDATE SET role = v_invite.role, is_active = true, updated_at = now();

  -- Mark invite as accepted
  UPDATE organization_invites
  SET status = 'accepted', accepted_by = v_user_id, accepted_at = now()
  WHERE id = v_invite.id;

  -- Ensure user has appropriate app_role
  IF v_invite.role IN ('admin', 'manager') THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (v_user_id, 'manager'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, organization_id, details, user_email)
  VALUES (
    v_user_id, 'invite_accepted', 'organization_invite', v_invite.id,
    v_invite.organization_id,
    jsonb_build_object('role', v_invite.role),
    v_invite.invited_email
  );

  RETURN jsonb_build_object('success', true, 'organization_id', v_invite.organization_id, 'role', v_invite.role);
END;
$$;

-- 13. get_invite_details function (public, no auth needed)
CREATE OR REPLACE FUNCTION public.get_invite_details(p_token text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invite record;
BEGIN
  SELECT i.*, o.name as org_name
  INTO v_invite
  FROM organization_invites i
  JOIN organizations o ON o.id = i.organization_id
  WHERE i.token = p_token;

  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Convite não encontrado');
  END IF;
  IF v_invite.status != 'pending' THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Este convite não está mais pendente');
  END IF;
  IF v_invite.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Este convite expirou');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'email', v_invite.invited_email,
    'role', v_invite.role,
    'organization_name', v_invite.org_name,
    'expires_at', v_invite.expires_at
  );
END;
$$;
