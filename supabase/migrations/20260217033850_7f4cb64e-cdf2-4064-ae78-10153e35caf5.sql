-- Add branding/identity fields to organizations for multi-tenant PDF reports
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#1e3a5f',
  ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#f0f4f8',
  ADD COLUMN IF NOT EXISTS watermark_url text;
