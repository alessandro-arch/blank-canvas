-- Fix ensure_profile_exists to not use email as full_name fallback
CREATE OR REPLACE FUNCTION ensure_profile_exists()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

    -- Fix: if profile has email as full_name, update it with metadata name
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

  -- Insert profile - use full_name from metadata, NULL if not provided (never email)
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