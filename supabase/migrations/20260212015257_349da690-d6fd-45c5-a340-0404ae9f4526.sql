
-- 1. Add new columns to messages table
ALTER TABLE public.messages 
  ADD COLUMN IF NOT EXISTS campaign_code text,
  ADD COLUMN IF NOT EXISTS provider text DEFAULT 'resend',
  ADD COLUMN IF NOT EXISTS provider_message_id text,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 2. Backfill sent_at from created_at for existing messages
UPDATE public.messages SET sent_at = created_at WHERE sent_at IS NULL;

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_campaign_code ON public.messages(campaign_code) WHERE campaign_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON public.messages(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_org_created ON public.messages(organization_id, created_at DESC);

-- 4. Drop old restrictive policy (only shows sender's own messages)
DROP POLICY IF EXISTS "messages_select_sent" ON public.messages;

-- 5. Admin can see ALL messages
CREATE POLICY "messages_select_admin_all"
ON public.messages FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. Manager can see org-scoped messages
CREATE POLICY "messages_select_manager_org"
ON public.messages FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role)
  AND organization_id IN (SELECT get_user_organizations())
);

-- 7. Admin/Manager can update org messages (soft delete, resend status)
CREATE POLICY "messages_update_admin_all"
ON public.messages FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "messages_update_manager_org" ON public.messages;
CREATE POLICY "messages_update_manager_org"
ON public.messages FOR UPDATE
USING (
  has_role(auth.uid(), 'manager'::app_role)
  AND organization_id IN (SELECT get_user_organizations())
)
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role)
  AND organization_id IN (SELECT get_user_organizations())
);

-- 8. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_messages_updated_at();
