-- Create a function that ensures a profile exists for the current user
-- This serves as a fallback if the handle_new_user trigger fails
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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'Not authenticated');
  END IF;

  -- Check if profile already exists
  SELECT EXISTS(SELECT 1 FROM profiles WHERE user_id = v_user_id) INTO v_profile_exists;
  
  IF v_profile_exists THEN
    RETURN jsonb_build_object('status', 'exists');
  END IF;

  -- Get user data from auth.users
  SELECT id, email, raw_user_meta_data INTO v_user
  FROM auth.users WHERE id = v_user_id;

  IF v_user IS NULL THEN
    RETURN jsonb_build_object('status', 'error', 'message', 'User not found');
  END IF;

  v_invite_code := v_user.raw_user_meta_data->>'invite_code';

  -- Try to find invite code record
  IF v_invite_code IS NOT NULL AND TRIM(v_invite_code) != '' THEN
    SELECT * INTO v_invite_record
    FROM invite_codes
    WHERE code = UPPER(TRIM(v_invite_code));
  END IF;

  -- Insert profile
  INSERT INTO profiles (
    user_id, full_name, cpf, origin,
    thematic_project_id, partner_company_id,
    invite_code_used, invite_used_at
  ) VALUES (
    v_user_id,
    COALESCE(v_user.raw_user_meta_data->>'full_name', v_user.email),
    NULLIF(regexp_replace(COALESCE(v_user.raw_user_meta_data->>'cpf', ''), '[^0-9]', '', 'g'), ''),
    COALESCE(v_user.raw_user_meta_data->>'origin', 'fallback'),
    v_invite_record.thematic_project_id,
    v_invite_record.partner_company_id,
    v_invite_code,
    CASE WHEN v_invite_code IS NOT NULL THEN now() ELSE NULL END
  );

  -- Ensure user_role exists
  IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = v_user_id) THEN
    -- Check if org invite
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