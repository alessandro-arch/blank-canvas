
-- Update insert_audit_log to stop storing user_email and user_agent for privacy/data minimization
CREATE OR REPLACE FUNCTION public.insert_audit_log(
  p_action text,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL::uuid,
  p_details jsonb DEFAULT '{}'::jsonb,
  p_previous_value jsonb DEFAULT NULL::jsonb,
  p_new_value jsonb DEFAULT NULL::jsonb,
  p_user_agent text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_log_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to create audit logs';
  END IF;
  
  IF NOT (has_role(v_user_id, 'admin'::app_role) OR has_role(v_user_id, 'manager'::app_role)) THEN
    RAISE EXCEPTION 'Only admins and managers can create audit logs';
  END IF;
  
  -- Insert audit log WITHOUT user_email and user_agent for data minimization
  -- user_email can be resolved via user_id join when needed
  -- p_user_agent parameter kept for backward compatibility but not stored
  INSERT INTO public.audit_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details,
    previous_value,
    new_value
  ) VALUES (
    v_user_id,
    p_action,
    p_entity_type,
    p_entity_id,
    COALESCE(p_details, '{}'::jsonb),
    p_previous_value,
    p_new_value
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$function$;

-- Also update create_org_invite to stop storing user_email in audit_logs
CREATE OR REPLACE FUNCTION public.create_org_invite(p_organization_id uuid, p_email text, p_role text, p_expires_days integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF p_role = 'admin' AND NOT is_org_admin(p_organization_id) AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Somente admins podem convidar outros admins';
  END IF;

  IF EXISTS (
    SELECT 1 FROM organization_members om
    JOIN auth.users u ON u.id = om.user_id
    WHERE om.organization_id = p_organization_id
      AND u.email = p_email
      AND om.is_active = true
  ) THEN
    RAISE EXCEPTION 'Este usuário já é membro ativo desta organização';
  END IF;

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

  -- Audit log WITHOUT user_email for data minimization
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, organization_id, details)
  VALUES (
    auth.uid(), 'invite_created', 'organization_invite', v_invite_id,
    p_organization_id,
    jsonb_build_object('role', p_role, 'expires_days', p_expires_days)
  );

  RETURN jsonb_build_object('invite_id', v_invite_id, 'token', v_token);
END;
$function$;

-- Update accept_org_invite to stop storing user_email
CREATE OR REPLACE FUNCTION public.accept_org_invite(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id AND email = v_invite.invited_email) THEN
    RAISE EXCEPTION 'Este convite foi enviado para outro e-mail';
  END IF;

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

  INSERT INTO organization_members (user_id, organization_id, role, is_active)
  VALUES (v_user_id, v_invite.organization_id, v_invite.role, true)
  ON CONFLICT (user_id, organization_id)
  DO UPDATE SET role = v_invite.role, is_active = true, updated_at = now();

  UPDATE organization_invites
  SET status = 'accepted', accepted_by = v_user_id, accepted_at = now()
  WHERE id = v_invite.id;

  IF v_invite.role IN ('admin', 'manager') THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (v_user_id, 'manager'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- Audit log WITHOUT user_email for data minimization
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, organization_id, details)
  VALUES (
    v_user_id, 'invite_accepted', 'organization_invite', v_invite.id,
    v_invite.organization_id,
    jsonb_build_object('role', v_invite.role)
  );

  RETURN jsonb_build_object('success', true, 'organization_id', v_invite.organization_id, 'role', v_invite.role);
END;
$function$;
