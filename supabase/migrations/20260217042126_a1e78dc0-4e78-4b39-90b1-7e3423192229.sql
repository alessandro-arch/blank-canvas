
-- Create user_settings table
CREATE TABLE public.user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  theme_mode text NOT NULL DEFAULT 'system',
  sidebar_behavior text NOT NULL DEFAULT 'expanded',
  density text NOT NULL DEFAULT 'comfortable',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add validation trigger for theme_mode
CREATE OR REPLACE FUNCTION public.validate_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.theme_mode NOT IN ('light', 'dark', 'system') THEN
    RAISE EXCEPTION 'theme_mode must be light, dark, or system';
  END IF;
  IF NEW.sidebar_behavior NOT IN ('expanded', 'collapsed', 'hover') THEN
    RAISE EXCEPTION 'sidebar_behavior must be expanded, collapsed, or hover';
  END IF;
  IF NEW.density NOT IN ('comfortable', 'compact') THEN
    RAISE EXCEPTION 'density must be comfortable or compact';
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_user_settings_trigger
BEFORE INSERT OR UPDATE ON public.user_settings
FOR EACH ROW EXECUTE FUNCTION public.validate_user_settings();

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only manage their own settings
CREATE POLICY "user_settings_select_own" ON public.user_settings
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_settings_insert_own" ON public.user_settings
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_settings_update_own" ON public.user_settings
FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_settings_delete_own" ON public.user_settings
FOR DELETE USING (user_id = auth.uid());

-- Deny anon
CREATE POLICY "user_settings_deny_anon" ON public.user_settings
FOR SELECT USING (false);

-- Add missing columns to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS default_admin_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS default_currency text DEFAULT 'BRL';
