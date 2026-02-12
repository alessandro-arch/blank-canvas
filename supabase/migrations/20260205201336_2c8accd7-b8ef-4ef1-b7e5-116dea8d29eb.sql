-- =============================================
-- 1. ADD NEW COLUMNS TO PROFILES TABLE
-- =============================================

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS thematic_project_id uuid NULL,
ADD COLUMN IF NOT EXISTS partner_company_id uuid NULL,
ADD COLUMN IF NOT EXISTS onboarding_status text NOT NULL DEFAULT 'AGUARDANDO_ATRIBUICAO',
ADD COLUMN IF NOT EXISTS invite_code_used text NULL,
ADD COLUMN IF NOT EXISTS invite_used_at timestamptz NULL;

-- =============================================
-- 2. CREATE INVITE_CODES TABLE
-- =============================================

CREATE TABLE public.invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thematic_project_id uuid NOT NULL,
  partner_company_id uuid NOT NULL,
  code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'expired', 'exhausted')),
  max_uses int NULL,
  used_count int NOT NULL DEFAULT 0,
  expires_at date NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS with FORCE
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_codes FORCE ROW LEVEL SECURITY;

-- RLS Policies for invite_codes
-- SELECT: manager and admin only
CREATE POLICY "invite_codes_select_manager_admin"
ON public.invite_codes
FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- INSERT: manager and admin only
CREATE POLICY "invite_codes_insert_manager_admin"
ON public.invite_codes
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- UPDATE: manager and admin only
CREATE POLICY "invite_codes_update_manager_admin"
ON public.invite_codes
FOR UPDATE
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- DELETE: admin only
CREATE POLICY "invite_codes_delete_admin_only"
ON public.invite_codes
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 3. CREATE INVITE_CODE_USES TABLE
-- =============================================

CREATE TABLE public.invite_code_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code_id uuid NOT NULL REFERENCES public.invite_codes(id) ON DELETE CASCADE,
  used_by uuid NOT NULL,
  used_by_email text NOT NULL,
  used_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS with FORCE
ALTER TABLE public.invite_code_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_code_uses FORCE ROW LEVEL SECURITY;

-- RLS Policies for invite_code_uses
-- SELECT: manager and admin only
CREATE POLICY "invite_code_uses_select_manager_admin"
ON public.invite_code_uses
FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- NO INSERT policy for authenticated users (service role only via Edge Function)
-- This ensures no direct client INSERT is allowed

-- =============================================
-- 4. UPDATE PROFILES RLS FOR GRANULAR CONTROL
-- =============================================

-- Drop existing update policies to recreate with granular control
DROP POLICY IF EXISTS "Profiles: update own" ON public.profiles;

-- Scholars can update only non-sensitive fields on their own profile
CREATE POLICY "Profiles: update own non-sensitive"
ON public.profiles
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Note: Field-level restrictions will be enforced via Edge Functions
-- since Postgres RLS cannot restrict individual columns directly.
-- The policy allows UPDATE but the application layer must validate
-- that scholars cannot modify cpf, thematic_project_id, partner_company_id, 
-- onboarding_status, invite_code_used, invite_used_at fields.

-- =============================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON public.invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_status ON public.invite_codes(status);
CREATE INDEX IF NOT EXISTS idx_invite_codes_thematic_project ON public.invite_codes(thematic_project_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_partner_company ON public.invite_codes(partner_company_id);
CREATE INDEX IF NOT EXISTS idx_invite_code_uses_invite_code ON public.invite_code_uses(invite_code_id);
CREATE INDEX IF NOT EXISTS idx_invite_code_uses_used_by ON public.invite_code_uses(used_by);
CREATE INDEX IF NOT EXISTS idx_profiles_thematic_project ON public.profiles(thematic_project_id);
CREATE INDEX IF NOT EXISTS idx_profiles_partner_company ON public.profiles(partner_company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_status ON public.profiles(onboarding_status);