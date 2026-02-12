-- ================================================================
-- SECURITY FIX: Restrict manager access by organization
-- Only allow managers to see profiles/bank_accounts of users
-- belonging to organizations they are members of.
-- Admins retain full access.
-- ================================================================

-- Helper function: check if current user can access a profile by organization
CREATE OR REPLACE FUNCTION public.user_can_access_profile_by_org(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Admin can access all
  SELECT CASE 
    WHEN has_role(auth.uid(), 'admin'::app_role) THEN true
    -- Manager can access if target user is in same organization
    WHEN has_role(auth.uid(), 'manager'::app_role) THEN EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = p_user_id
        AND p.organization_id IN (SELECT get_user_organizations())
    )
    ELSE false
  END;
$$;

-- ================================================================
-- PROFILES: Update manager SELECT policy to filter by organization
-- ================================================================

-- Drop existing manager select policy
DROP POLICY IF EXISTS "Profiles: select manager/admin" ON public.profiles;

-- Create new policies: admin sees all, manager sees only org-scoped
CREATE POLICY "Profiles: select admin"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Profiles: select manager org-scoped"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role)
  AND organization_id IN (SELECT get_user_organizations())
);

-- ================================================================
-- BANK_ACCOUNTS: Update manager policies to filter by organization
-- ================================================================

-- Drop existing manager policies
DROP POLICY IF EXISTS "Managers can view all bank accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Managers can update bank accounts for validation" ON public.bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_select_manager" ON public.bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_update_manager" ON public.bank_accounts;

-- Create new org-scoped policies for bank_accounts

-- Admin can view all bank accounts
CREATE POLICY "bank_accounts_select_admin"
ON public.bank_accounts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Manager can only view bank accounts of users in their organizations
CREATE POLICY "bank_accounts_select_manager_org_scoped"
ON public.bank_accounts
FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role)
  AND user_can_access_profile_by_org(user_id)
);

-- Admin can update all bank accounts
CREATE POLICY "bank_accounts_update_admin"
ON public.bank_accounts
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Manager can only update bank accounts of users in their organizations
CREATE POLICY "bank_accounts_update_manager_org_scoped"
ON public.bank_accounts
FOR UPDATE
USING (
  has_role(auth.uid(), 'manager'::app_role)
  AND user_can_access_profile_by_org(user_id)
)
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role)
  AND user_can_access_profile_by_org(user_id)
);