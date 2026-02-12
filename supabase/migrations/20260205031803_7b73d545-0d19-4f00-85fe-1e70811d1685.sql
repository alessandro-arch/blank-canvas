-- Drop existing policies to replace with new ones
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Managers can view active profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Force RLS to prevent any bypass
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- 1) Bolsista: Só pode ver o próprio perfil
CREATE POLICY "Profiles: select own"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 2) Bolsista: Pode inserir o próprio perfil
CREATE POLICY "Profiles: insert own"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 3) Bolsista: Pode atualizar o próprio perfil
CREATE POLICY "Profiles: update own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 4) Gestor e Admin: Leem todos os perfis
CREATE POLICY "Profiles: select manager/admin"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));