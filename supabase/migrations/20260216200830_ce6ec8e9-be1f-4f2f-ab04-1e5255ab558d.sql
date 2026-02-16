
-- ============================================================
-- MIGRATION: Move PII (CPF, phone) from profiles to profiles_sensitive
-- Phases A + B + C combined
-- ============================================================

-- 1. Ensure unique constraint on profiles_sensitive.user_id for UPSERT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_sensitive_user_id_key'
  ) THEN
    ALTER TABLE profiles_sensitive ADD CONSTRAINT profiles_sensitive_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- 2. Migrate existing CPF/phone data from profiles to profiles_sensitive
INSERT INTO profiles_sensitive (user_id, cpf, phone)
SELECT user_id, cpf, phone FROM profiles
WHERE cpf IS NOT NULL OR phone IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET
  cpf = COALESCE(EXCLUDED.cpf, profiles_sensitive.cpf),
  phone = COALESCE(EXCLUDED.phone, profiles_sensitive.phone),
  updated_at = now();

-- 3. Ensure every profile has a corresponding profiles_sensitive row
INSERT INTO profiles_sensitive (user_id)
SELECT user_id FROM profiles
WHERE user_id NOT IN (SELECT user_id FROM profiles_sensitive)
ON CONFLICT (user_id) DO NOTHING;

-- 4. Remove admin access policies from profiles_sensitive (PII not visible to admins)
DROP POLICY IF EXISTS "Admins can view sensitive data" ON profiles_sensitive;
DROP POLICY IF EXISTS "Admins can update sensitive data" ON profiles_sensitive;

-- 5. Create upsert_sensitive_profile RPC function
CREATE OR REPLACE FUNCTION public.upsert_sensitive_profile(
  p_cpf text DEFAULT NULL,
  p_phone text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  INSERT INTO profiles_sensitive (user_id, cpf, phone)
  VALUES (v_user_id, p_cpf, p_phone)
  ON CONFLICT (user_id) DO UPDATE SET
    cpf = COALESCE(p_cpf, profiles_sensitive.cpf),
    phone = COALESCE(p_phone, profiles_sensitive.phone),
    updated_at = now();

  -- Audit log (no PII in details)
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (
    v_user_id,
    'sensitive_profile_upsert',
    'profiles_sensitive',
    v_user_id,
    jsonb_build_object(
      'cpf_updated', p_cpf IS NOT NULL,
      'phone_updated', p_phone IS NOT NULL
    )
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 6. Update handle_new_user to write CPF to profiles_sensitive instead of profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  assigned_role app_role;
  is_seed_admin boolean := false;
  v_invite_code text;
  v_invite_record record;
  v_cpf_clean text;
  v_org_invite_token text;
  v_is_org_invite boolean := false;
BEGIN
  -- Check if this is the institutional seed admin email
  IF NEW.email = 'administrativo@icca.org.br' THEN
    assigned_role := 'admin';
    is_seed_admin := true;
  ELSE
    -- Check if this is an org invite signup
    v_org_invite_token := NEW.raw_user_meta_data->>'org_invite_token';

    IF v_org_invite_token IS NOT NULL AND TRIM(v_org_invite_token) != '' THEN
      IF EXISTS (
        SELECT 1 FROM public.organization_invites
        WHERE token = v_org_invite_token
          AND status = 'pending'
          AND expires_at > now()
      ) THEN
        v_is_org_invite := true;
        assigned_role := 'manager';
      ELSE
        RAISE EXCEPTION 'Token de convite de organização inválido ou expirado';
      END IF;
    ELSE
      -- Regular scholar signup - requires invite code
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
        RAISE EXCEPTION 'Código de convite inválido: %', v_invite_code;
      END IF;

      IF v_invite_record.status != 'active' THEN
        RAISE EXCEPTION 'Código de convite não está ativo: %', v_invite_code;
      END IF;

      IF v_invite_record.expires_at IS NOT NULL AND v_invite_record.expires_at < CURRENT_DATE THEN
        UPDATE public.invite_codes SET status = 'expired' WHERE id = v_invite_record.id;
        RAISE EXCEPTION 'Código de convite expirado: %', v_invite_code;
      END IF;

      IF v_invite_record.max_uses IS NOT NULL AND v_invite_record.used_count >= v_invite_record.max_uses THEN
        UPDATE public.invite_codes SET status = 'exhausted' WHERE id = v_invite_record.id;
        RAISE EXCEPTION 'Código de convite atingiu limite de usos: %', v_invite_code;
      END IF;
    END IF;
  END IF;

  v_cpf_clean := regexp_replace(COALESCE(NEW.raw_user_meta_data->>'cpf', ''), '[^0-9]', '', 'g');
  IF v_cpf_clean = '' THEN
    v_cpf_clean := NULL;
  END IF;

  -- Create profile (WITHOUT cpf/phone - PII goes to profiles_sensitive)
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

  -- Create profiles_sensitive with CPF (PII stored separately)
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
    RAISE LOG '[SEED_ADMIN] Papel Admin Master atribuído automaticamente ao usuário institucional: % (user_id: %)', NEW.email, NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- 7. Update ensure_profile_exists to write CPF to profiles_sensitive
CREATE OR REPLACE FUNCTION public.ensure_profile_exists()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_user record;
  v_profile_exists boolean;
  v_invite_code text;
  v_invite_record record;
  v_cpf_clean text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Not authenticated');
  END IF;

  SELECT EXISTS(SELECT 1 FROM profiles WHERE user_id = v_user_id) INTO v_profile_exists;

  IF v_profile_exists THEN
    -- Ensure profiles_sensitive also exists
    INSERT INTO profiles_sensitive (user_id)
    VALUES (v_user_id)
    ON CONFLICT (user_id) DO NOTHING;

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

  -- Insert profile WITHOUT cpf/phone
  INSERT INTO profiles (
    user_id, full_name, origin,
    thematic_project_id, partner_company_id,
    invite_code_used, invite_used_at
  ) VALUES (
    v_user_id,
    COALESCE(v_user.raw_user_meta_data->>'full_name', v_user.email),
    COALESCE(v_user.raw_user_meta_data->>'origin', 'fallback'),
    v_invite_record.thematic_project_id,
    v_invite_record.partner_company_id,
    v_invite_code,
    CASE WHEN v_invite_code IS NOT NULL THEN now() ELSE NULL END
  );

  -- Insert CPF into profiles_sensitive
  INSERT INTO profiles_sensitive (user_id, cpf)
  VALUES (v_user_id, v_cpf_clean)
  ON CONFLICT (user_id) DO UPDATE SET
    cpf = COALESCE(v_cpf_clean, profiles_sensitive.cpf),
    updated_at = now();

  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_user_id) THEN
    IF v_user.raw_user_meta_data->>'org_invite_token' IS NOT NULL THEN
      INSERT INTO user_roles (user_id, role) VALUES (v_user_id, 'manager');
    ELSIF v_user.email = 'administrativo@icca.org.br' THEN
      INSERT INTO user_roles (user_id, role) VALUES (v_user_id, 'admin');
    ELSE
      INSERT INTO user_roles (user_id, role) VALUES (v_user_id, 'scholar');
    END IF;
  END IF;

  RETURN jsonb_build_object('status', 'created');
END;
$$;

-- 8. Drop cpf and phone columns from profiles (PII now lives in profiles_sensitive)
ALTER TABLE profiles DROP COLUMN IF EXISTS cpf;
ALTER TABLE profiles DROP COLUMN IF EXISTS phone;
