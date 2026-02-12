-- ============================================================
-- FASE 1: ESTRUTURA MULTI-TENANT (COMPLETA)
-- ============================================================

-- 1. Criar tabela de organizações
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  settings jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Criar tabela de membros da organização
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'manager', 'member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Trigger para updated_at
CREATE TRIGGER update_organization_members_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Adicionar organization_id às tabelas principais
ALTER TABLE public.thematic_projects 
  ADD COLUMN organization_id uuid REFERENCES public.organizations(id);

ALTER TABLE public.profiles 
  ADD COLUMN organization_id uuid REFERENCES public.organizations(id);

ALTER TABLE public.invite_codes 
  ADD COLUMN organization_id uuid REFERENCES public.organizations(id);

-- 4. Criar organização ICCA como padrão (UUID válido)
INSERT INTO public.organizations (id, name, slug, settings)
VALUES (
  'a1111111-1111-1111-1111-111111111111',
  'Instituto ICCA',
  'icca',
  '{"default": true}'::jsonb
);

-- 5. Migrar dados existentes para a organização ICCA
UPDATE public.thematic_projects 
SET organization_id = 'a1111111-1111-1111-1111-111111111111'
WHERE organization_id IS NULL;

UPDATE public.profiles 
SET organization_id = 'a1111111-1111-1111-1111-111111111111'
WHERE organization_id IS NULL;

UPDATE public.invite_codes 
SET organization_id = 'a1111111-1111-1111-1111-111111111111'
WHERE organization_id IS NULL;

-- 6. Adicionar membros existentes à organização ICCA
INSERT INTO public.organization_members (organization_id, user_id, role)
SELECT 
  'a1111111-1111-1111-1111-111111111111',
  ur.user_id,
  CASE 
    WHEN ur.role = 'admin' THEN 'owner'
    WHEN ur.role = 'manager' THEN 'manager'
    ELSE 'member'
  END
FROM public.user_roles ur
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- 7. Criar função helper para verificar acesso à organização
CREATE OR REPLACE FUNCTION public.user_has_org_access(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = p_org_id
      AND user_id = auth.uid()
  )
$$;

-- 8. Criar função para obter organizações do usuário
CREATE OR REPLACE FUNCTION public.get_user_organizations()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = auth.uid()
$$;

-- 9. Criar função para verificar role na organização
CREATE OR REPLACE FUNCTION public.user_org_role(p_org_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.organization_members
  WHERE organization_id = p_org_id
    AND user_id = auth.uid()
  LIMIT 1
$$;

-- 10. Habilitar RLS nas novas tabelas
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 11. Políticas RLS para organizations
CREATE POLICY "org_select_members"
  ON public.organizations
  FOR SELECT
  USING (public.user_has_org_access(id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "org_insert_admin"
  ON public.organizations
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "org_update_owner"
  ON public.organizations
  FOR UPDATE
  USING (
    public.user_org_role(id) = 'owner' 
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "org_delete_superadmin"
  ON public.organizations
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 12. Políticas RLS para organization_members
CREATE POLICY "org_members_select"
  ON public.organization_members
  FOR SELECT
  USING (
    public.user_has_org_access(organization_id) 
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "org_members_insert_owner"
  ON public.organization_members
  FOR INSERT
  WITH CHECK (
    public.user_org_role(organization_id) IN ('owner', 'admin')
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "org_members_update_owner"
  ON public.organization_members
  FOR UPDATE
  USING (
    public.user_org_role(organization_id) IN ('owner', 'admin')
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "org_members_delete_owner"
  ON public.organization_members
  FOR DELETE
  USING (
    public.user_org_role(organization_id) IN ('owner', 'admin')
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- 13. Criar índices para performance
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX idx_thematic_projects_org ON public.thematic_projects(organization_id);
CREATE INDEX idx_profiles_org ON public.profiles(organization_id);
CREATE INDEX idx_invite_codes_org ON public.invite_codes(organization_id);