-- Add html_template column to store full HTML email template with placeholders
ALTER TABLE public.message_templates 
ADD COLUMN IF NOT EXISTS html_template text;

-- Add is_default column to mark the default template per org
ALTER TABLE public.message_templates 
ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;