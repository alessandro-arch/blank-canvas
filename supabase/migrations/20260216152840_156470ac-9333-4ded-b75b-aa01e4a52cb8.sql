
-- Add email tracking columns to organization_invites
ALTER TABLE public.organization_invites
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS email_provider_id text NULL,
  ADD COLUMN IF NOT EXISTS send_error text NULL;
