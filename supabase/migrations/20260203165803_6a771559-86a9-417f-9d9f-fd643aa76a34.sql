-- Add server-side CPF format validation (defense-in-depth)
-- CPF must be NULL or exactly 11 numeric digits

ALTER TABLE public.profiles_sensitive 
ADD CONSTRAINT profiles_sensitive_cpf_format_check 
CHECK (cpf IS NULL OR cpf ~ '^[0-9]{11}$');

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_cpf_format_check 
CHECK (cpf IS NULL OR cpf ~ '^[0-9]{11}$');