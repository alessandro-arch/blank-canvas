-- Garante que RLS está ativo
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remove política anterior se existir (incluindo a que criamos antes)
DROP POLICY IF EXISTS "deny_anon_select" ON public.profiles;
DROP POLICY IF EXISTS "deny_anon_access_profiles" ON public.profiles;

-- Bloqueio explícito para usuário NÃO autenticado (anon)
CREATE POLICY "deny_anon_select"
ON public.profiles
FOR SELECT
TO anon
USING (false);