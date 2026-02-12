-- Update the handle_new_user function to accept origin from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, cpf, origin)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'cpf',
    COALESCE(NEW.raw_user_meta_data->>'origin', 'manual')
  );
  
  -- Default role is scholar
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'scholar');
  
  RETURN NEW;
END;
$function$;