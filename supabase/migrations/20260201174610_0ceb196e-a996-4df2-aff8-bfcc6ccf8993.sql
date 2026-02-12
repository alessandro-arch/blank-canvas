-- Add origin column to profiles table to track registration source
ALTER TABLE public.profiles
ADD COLUMN origin TEXT DEFAULT 'manual';

-- Add constraint for valid origin values
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_origin_check 
CHECK (origin IN ('manual', 'import'));

-- Comment for documentation
COMMENT ON COLUMN public.profiles.origin IS 'Source of the profile creation: manual (created via UI) or import (created via spreadsheet import)';