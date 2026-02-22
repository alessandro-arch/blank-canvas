
-- Fix handle_new_user: check invite role before assigning user_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  assigned_role app_role;
  is_seed_admin boolean := false;
  v_invite_code text;
  v_invite_record record;
  v_cpf_clean text;
  v_org_invite_token text;
  v_is_org_invite boolean := false;
  v_org_invite_role text;
BEGIN
  IF NEW.email = 'administrativo@icca.org.br' THEN
    assigned_role := 'admin';
    is_seed_admin := true;
  ELSE
    v_org_invite_token := NEW.raw_user_meta_data->>'org_invite_token';

    IF v_org_invite_token IS NOT NULL AND TRIM(v_org_invite_token) != '' THEN
      -- Check invite exists and get its role
      SELECT role INTO v_org_invite_role
      FROM public.organization_invites
      WHERE token = v_org_invite_token
        AND status = 'pending'
        AND expires_at > now();

      IF v_org_invite_role IS NULL THEN
        RAISE EXCEPTION 'Token de convite de organização inválido ou expirado';
      END IF;

      v_is_org_invite := true;

      -- Assign role based on invite role
      IF v_org_invite_role = 'auditor' THEN
        assigned_role := 'auditor';
      ELSE
        assigned_role := 'manager';
      END IF;
    ELSE
      assigned_role := 'scholar';

      v_invite_code := NEW.raw_user_meta_data->>'invite_code';

      IF v_invite_code IS NULL OR TRIM(v_invite_code) = '' THEN
        RAISE EXCEPTION 'Código de convite é obrigatório para cadastro';
      END IF;

      SELECT * INTO v_invite_record
      FROM public.invite_codes
      WHERE code = UPPER(TRIM(v_invite_code))
      FOR UPDATE;

      IF v_invite_record IS NULL THEN
        RAISE EXCEPTION 'Código de convite inválido';
      END IF;

      IF v_invite_record.status != 'active' THEN
        RAISE EXCEPTION 'Código de convite não está ativo';
      END IF;

      IF v_invite_record.expires_at IS NOT NULL AND v_invite_record.expires_at < CURRENT_DATE THEN
        UPDATE public.invite_codes SET status = 'expired' WHERE id = v_invite_record.id;
        RAISE EXCEPTION 'Código de convite expirado';
      END IF;

      IF v_invite_record.max_uses IS NOT NULL AND v_invite_record.used_count >= v_invite_record.max_uses THEN
        UPDATE public.invite_codes SET status = 'exhausted' WHERE id = v_invite_record.id;
        RAISE EXCEPTION 'Código de convite atingiu limite de usos';
      END IF;
    END IF;
  END IF;

  v_cpf_clean := regexp_replace(COALESCE(NEW.raw_user_meta_data->>'cpf', ''), '[^0-9]', '', 'g');
  IF v_cpf_clean = '' THEN
    v_cpf_clean := NULL;
  END IF;

  INSERT INTO public.profiles (
    user_id, full_name, origin,
    thematic_project_id, partner_company_id,
    invite_code_used, invite_used_at
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    CASE
      WHEN is_seed_admin THEN 'manual'
      WHEN v_is_org_invite THEN 'org_invite'
      ELSE COALESCE(NEW.raw_user_meta_data->>'origin', 'manual')
    END,
    CASE WHEN NOT is_seed_admin AND NOT v_is_org_invite THEN v_invite_record.thematic_project_id ELSE NULL END,
    CASE WHEN NOT is_seed_admin AND NOT v_is_org_invite THEN v_invite_record.partner_company_id ELSE NULL END,
    CASE WHEN NOT is_seed_admin AND NOT v_is_org_invite THEN v_invite_code ELSE NULL END,
    CASE WHEN NOT is_seed_admin AND NOT v_is_org_invite THEN now() ELSE NULL END
  );

  INSERT INTO public.profiles_sensitive (user_id, cpf)
  VALUES (NEW.id, v_cpf_clean)
  ON CONFLICT (user_id) DO UPDATE SET
    cpf = COALESCE(v_cpf_clean, profiles_sensitive.cpf),
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role);

  IF NOT is_seed_admin AND NOT v_is_org_invite THEN
    INSERT INTO public.invite_code_uses (invite_code_id, used_by, used_by_email)
    VALUES (v_invite_record.id, NEW.id, NEW.email);

    UPDATE public.invite_codes
    SET used_count = used_count + 1
    WHERE id = v_invite_record.id;
  END IF;

  IF is_seed_admin THEN
    RAISE LOG '[SEED_ADMIN] Papel Admin Master atribuído automaticamente ao usuário institucional (user_id: %)', NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

-- Fix ensure_profile_exists: check invite role before assigning
CREATE OR REPLACE FUNCTION public.ensure_profile_exists()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_user record;
  v_profile_exists boolean;
  v_invite_code text;
  v_invite_record record;
  v_cpf_clean text;
  v_org_invite_role text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Not authenticated');
  END IF;

  SELECT EXISTS(SELECT 1 FROM profiles WHERE user_id = v_user_id) INTO v_profile_exists;

  IF v_profile_exists THEN
    INSERT INTO profiles_sensitive (user_id)
    VALUES (v_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT id, email, raw_user_meta_data INTO v_user
    FROM auth.users WHERE id = v_user_id;

    IF v_user IS NOT NULL AND v_user.raw_user_meta_data->>'full_name' IS NOT NULL 
       AND v_user.raw_user_meta_data->>'full_name' != v_user.email THEN
      UPDATE profiles 
      SET full_name = v_user.raw_user_meta_data->>'full_name',
          updated_at = now()
      WHERE user_id = v_user_id 
        AND (full_name IS NULL OR full_name = v_user.email);
    END IF;

    RETURN jsonb_build_object('status', 'exists');
  END IF;

  SELECT id, email, raw_user_meta_data INTO v_user
  FROM auth.users WHERE id = v_user_id;

  IF v_user IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'User not found');
  END IF;

  v_invite_code := v_user.raw_user_meta_data->>'invite_code';
  v_cpf_clean := regexp_replace(COALESCE(v_user.raw_user_meta_data->>'cpf', ''), '[^0-9]', '', 'g');
  IF v_cpf_clean = '' THEN
    v_cpf_clean := NULL;
  END IF;

  IF v_invite_code IS NOT NULL AND TRIM(v_invite_code) != '' THEN
    SELECT * INTO v_invite_record
    FROM invite_codes
    WHERE code = UPPER(TRIM(v_invite_code));
  END IF;

  INSERT INTO profiles (
    user_id, full_name, origin,
    thematic_project_id, partner_company_id,
    invite_code_used, invite_used_at
  ) VALUES (
    v_user_id,
    v_user.raw_user_meta_data->>'full_name',
    COALESCE(v_user.raw_user_meta_data->>'origin', 'fallback'),
    v_invite_record.thematic_project_id,
    v_invite_record.partner_company_id,
    v_invite_code,
    CASE WHEN v_invite_code IS NOT NULL THEN now() ELSE NULL END
  );

  INSERT INTO profiles_sensitive (user_id, cpf)
  VALUES (v_user_id, v_cpf_clean)
  ON CONFLICT (user_id) DO UPDATE SET
    cpf = COALESCE(v_cpf_clean, profiles_sensitive.cpf),
    updated_at = now();

  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_user_id) THEN
    IF v_user.raw_user_meta_data->>'org_invite_token' IS NOT NULL THEN
      -- Check the invite role instead of always assigning manager
      SELECT role INTO v_org_invite_role
      FROM organization_invites
      WHERE token = v_user.raw_user_meta_data->>'org_invite_token'
      LIMIT 1;

      IF v_org_invite_role = 'auditor' THEN
        INSERT INTO user_roles (user_id, role) VALUES (v_user_id, 'auditor');
      ELSE
        INSERT INTO user_roles (user_id, role) VALUES (v_user_id, 'manager');
      END IF;
    ELSIF v_user.email = 'administrativo@icca.org.br' THEN
      INSERT INTO user_roles (user_id, role) VALUES (v_user_id, 'admin');
    ELSE
      INSERT INTO user_roles (user_id, role) VALUES (v_user_id, 'scholar');
    END IF;
  END IF;

  RETURN jsonb_build_object('status', 'created');
END;
$function$;

-- Clean up existing data: remove 'manager' role from users who are auditors in org_members
-- but incorrectly got 'manager' in user_roles, and don't have any actual manager/admin org membership
DELETE FROM user_roles
WHERE role = 'manager'
  AND user_id IN (
    SELECT ur.user_id
    FROM user_roles ur
    WHERE ur.role = 'manager'
      AND EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.user_id = ur.user_id AND om.role = 'auditor' AND om.is_active = true
      )
      AND NOT EXISTS (
        SELECT 1 FROM organization_members om2
        WHERE om2.user_id = ur.user_id AND om2.role IN ('admin', 'manager', 'owner') AND om2.is_active = true
      )
      AND NOT EXISTS (
        SELECT 1 FROM user_roles ur2
        WHERE ur2.user_id = ur.user_id AND ur2.role = 'admin'
      )
  );
