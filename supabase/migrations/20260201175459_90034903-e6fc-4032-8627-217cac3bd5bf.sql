-- Update handle_new_user function to implement Seed Admin rule
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  assigned_role app_role;
  is_seed_admin boolean := false;
BEGIN
  -- Check if this is the institutional seed admin email
  IF NEW.email = 'administrativo@icca.org.br' THEN
    assigned_role := 'admin';
    is_seed_admin := true;
  ELSE
    assigned_role := 'scholar';
  END IF;

  -- Create profile
  INSERT INTO public.profiles (user_id, email, full_name, cpf, origin)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'cpf',
    COALESCE(NEW.raw_user_meta_data->>'origin', 'manual')
  );
  
  -- Assign role based on email check
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role);
  
  -- Log seed admin assignment
  IF is_seed_admin THEN
    RAISE LOG '[SEED_ADMIN] Papel Admin Master atribuído automaticamente ao usuário institucional: % (user_id: %)', NEW.email, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;