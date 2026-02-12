-- =====================================================
-- SECURITY FIX: Profiles Table RLS Hardening
-- Auditor requirement: Strict separation of access policies
-- =====================================================

-- 1. DROP ALL EXISTING SELECT POLICIES on profiles to start clean
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Managers can view active profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers can view all profiles" ON public.profiles;

-- 2. CREATE STRICT USER POLICY - No OR conditions, no has_role(), no exceptions
-- Requirement: USING (user_id = auth.uid()) ONLY
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (user_id = auth.uid());

-- 3. CREATE SEPARATE MANAGER POLICY - Only active profiles
CREATE POLICY "Managers can view active profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role) 
  AND is_active = true
);

-- 4. CREATE SEPARATE ADMIN POLICY - Full access for admin master
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 5. HARDEN user_roles TABLE RLS
-- Ensure roles table cannot be bypassed
-- =====================================================

-- Drop existing policies to recreate with stricter rules
DROP POLICY IF EXISTS "Deny public access to user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins and managers can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;

-- Strict policy: Users can ONLY see their own role
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

-- Admins can view all roles (for user management)
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Managers can view roles (needed for scholar management)
CREATE POLICY "Managers can view roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role));

-- Only admins can delete roles
CREATE POLICY "Admins can delete user roles"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 6. CREATE SENSITIVE DATA TABLE (Optional but recommended)
-- Separates CPF, phone from main profiles table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profiles_sensitive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  cpf text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles_sensitive ENABLE ROW LEVEL SECURITY;

-- STRICT RLS: Only user can see their own sensitive data
CREATE POLICY "Users can view their own sensitive data"
ON public.profiles_sensitive
FOR SELECT
USING (user_id = auth.uid());

-- Users can insert their own sensitive data
CREATE POLICY "Users can insert their own sensitive data"
ON public.profiles_sensitive
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own sensitive data
CREATE POLICY "Users can update their own sensitive data"
ON public.profiles_sensitive
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can view sensitive data (for support/compliance)
CREATE POLICY "Admins can view sensitive data"
ON public.profiles_sensitive
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update sensitive data (for corrections)
CREATE POLICY "Admins can update sensitive data"
ON public.profiles_sensitive
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Managers CANNOT see sensitive data by default (audit requirement)
-- They only see masked data through application layer

-- Trigger for updated_at
CREATE TRIGGER update_profiles_sensitive_updated_at
  BEFORE UPDATE ON public.profiles_sensitive
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 7. MIGRATE EXISTING SENSITIVE DATA
-- Move CPF and phone from profiles to profiles_sensitive
-- =====================================================

INSERT INTO public.profiles_sensitive (user_id, cpf, phone, created_at, updated_at)
SELECT user_id, cpf, phone, created_at, updated_at
FROM public.profiles
WHERE cpf IS NOT NULL OR phone IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET
  cpf = EXCLUDED.cpf,
  phone = EXCLUDED.phone,
  updated_at = now();

-- Note: We keep the columns in profiles for now to avoid breaking changes
-- They should be deprecated and removed in a future migration after code update

-- =====================================================
-- 8. ADD COMMENT FOR AUDIT TRAIL
-- =====================================================

COMMENT ON TABLE public.profiles_sensitive IS 'Sensitive PII data (CPF, phone) with strict RLS. Only user and admin can access.';
COMMENT ON POLICY "Users can view their own profile" ON public.profiles IS 'STRICT: No OR conditions, no has_role(), user_id = auth.uid() only';
COMMENT ON POLICY "Managers can view active profiles" ON public.profiles IS 'Managers can only see active profiles, not inactive/suspended';
COMMENT ON POLICY "Admins can view all profiles" ON public.profiles IS 'Admin Master full access for compliance/support';