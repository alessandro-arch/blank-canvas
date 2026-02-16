
-- Add send_attempts column to organization_invites
ALTER TABLE public.organization_invites
ADD COLUMN IF NOT EXISTS send_attempts integer NOT NULL DEFAULT 0;
