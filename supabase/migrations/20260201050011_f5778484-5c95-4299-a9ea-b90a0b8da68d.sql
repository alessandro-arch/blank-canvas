-- Add policy for managers to view all profiles
CREATE POLICY "Managers can view all profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Update handle_new_user function to also save CPF
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, cpf)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'cpf'
  );
  
  -- Default role is scholar
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'scholar');
  
  RETURN NEW;
END;
$function$;