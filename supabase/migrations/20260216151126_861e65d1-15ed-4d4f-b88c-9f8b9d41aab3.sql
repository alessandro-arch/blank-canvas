
-- Update handle_new_user to NOT store email in profiles
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
BEGIN
  -- Check if this is the institutional seed admin email
  IF NEW.email = 'administrativo@icca.org.br' THEN
    assigned_role := 'admin';
    is_seed_admin := true;
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

  v_cpf_clean := regexp_replace(COALESCE(NEW.raw_user_meta_data->>'cpf', ''), '[^0-9]', '', 'g');
  IF v_cpf_clean = '' THEN
    v_cpf_clean := NULL;
  END IF;

  -- Create profile WITHOUT email (email lives only in auth.users)
  INSERT INTO public.profiles (
    user_id, full_name, cpf, origin,
    thematic_project_id, partner_company_id, 
    invite_code_used, invite_used_at
  )
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name',
    v_cpf_clean,
    COALESCE(NEW.raw_user_meta_data->>'origin', 'manual'),
    CASE WHEN NOT is_seed_admin THEN v_invite_record.thematic_project_id ELSE NULL END,
    CASE WHEN NOT is_seed_admin THEN v_invite_record.partner_company_id ELSE NULL END,
    CASE WHEN NOT is_seed_admin THEN v_invite_code ELSE NULL END,
    CASE WHEN NOT is_seed_admin THEN now() ELSE NULL END
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role);
  
  IF NOT is_seed_admin THEN
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
$function$;
