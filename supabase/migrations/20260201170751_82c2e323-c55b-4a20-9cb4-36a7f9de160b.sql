-- Add academic fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN institution TEXT,
ADD COLUMN academic_level TEXT,
ADD COLUMN lattes_url TEXT;

-- Add check constraint for academic_level values
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_academic_level_check 
CHECK (academic_level IS NULL OR academic_level IN (
  'ensino_medio_completo',
  'graduado',
  'mestrado',
  'doutorado',
  'pos_doutorado'
));

-- Add check constraint for lattes_url to ensure it's a valid URL format (basic check)
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_lattes_url_check 
CHECK (lattes_url IS NULL OR lattes_url ~ '^https?://.*$');