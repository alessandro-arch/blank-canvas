-- Force RLS to prevent any bypass
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;

-- Revoke direct access, only through RLS policies
REVOKE ALL ON public.user_roles FROM anon;

-- Drop existing policies to reorganize
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Managers can view roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;

-- 1) User can view their own role
CREATE POLICY "Roles: select own"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 2) Admin can view all roles
CREATE POLICY "Roles: select admin"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3) Manager can view roles (for user management)
CREATE POLICY "Roles: select manager"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role));

-- 4) Only admin can insert roles (explicit deny for others)
CREATE POLICY "Roles: insert admin only"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5) Only admin can update roles
CREATE POLICY "Roles: update admin only"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 6) Only admin can delete roles
CREATE POLICY "Roles: delete admin only"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));