-- =====================================================
-- PARTE 1: Criar tabela thematic_projects (sem RLS dependente)
-- =====================================================

-- 1. Criar tabela mestre de Projetos Temáticos
CREATE TABLE public.thematic_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  sponsor_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed')),
  start_date DATE,
  end_date DATE,
  observations TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Habilitar RLS na tabela thematic_projects
ALTER TABLE public.thematic_projects ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS básicas (sem dependência de projects)
CREATE POLICY "Managers can view all thematic projects"
  ON public.thematic_projects FOR SELECT
  USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can insert thematic projects"
  ON public.thematic_projects FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can update thematic projects"
  ON public.thematic_projects FOR UPDATE
  USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete thematic projects"
  ON public.thematic_projects FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Trigger para updated_at em thematic_projects
CREATE TRIGGER update_thematic_projects_updated_at
  BEFORE UPDATE ON public.thematic_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Inserir o Projeto Temático Mestre (seed) PRIMEIRO
INSERT INTO public.thematic_projects (id, title, sponsor_name, status, start_date, end_date)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Desenvolvimento e a aplicação de métodos quimiométricos para a análise multivariada de dados clínicos e instrumentais, uma iniciativa de alta relevância científica e tecnológica.',
  'LABORATÓRIO TOMMASI',
  'active',
  '2026-01-01',
  '2028-12-31'
);

-- 6. Adicionar coluna thematic_project_id na tabela projects
ALTER TABLE public.projects 
  ADD COLUMN thematic_project_id UUID REFERENCES public.thematic_projects(id);

-- 7. Vincular todos os projetos existentes ao Projeto Temático Mestre
UPDATE public.projects 
SET thematic_project_id = 'a0000000-0000-0000-0000-000000000001';

-- 8. Tornar thematic_project_id NOT NULL (após migração dos dados)
ALTER TABLE public.projects 
  ALTER COLUMN thematic_project_id SET NOT NULL;

-- 9. Renomear coluna empresa_parceira para orientador (nomenclatura correta)
ALTER TABLE public.projects 
  RENAME COLUMN empresa_parceira TO orientador;

-- 10. Remover colunas desnecessárias de projects
ALTER TABLE public.projects DROP COLUMN IF EXISTS is_thematic;
ALTER TABLE public.projects DROP COLUMN IF EXISTS parent_project_id;

-- 11. Adicionar índice para performance
CREATE INDEX idx_projects_thematic_project_id ON public.projects(thematic_project_id);

-- 12. Atualizar invite_codes para usar o novo projeto temático
UPDATE public.invite_codes 
SET thematic_project_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE thematic_project_id IS NOT NULL;

-- 13. Atualizar profiles para referenciar o novo projeto temático
UPDATE public.profiles 
SET thematic_project_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE thematic_project_id IS NOT NULL;

-- 14. Agora criar a política RLS para scholars (após a coluna existir)
CREATE POLICY "Scholars can view their thematic project"
  ON public.thematic_projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN projects p ON e.project_id = p.id
      WHERE p.thematic_project_id = thematic_projects.id
      AND e.user_id = auth.uid()
    )
  );