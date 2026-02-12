-- Renomear campos para refletir modelo institucional ICCA
-- proponent_name -> empresa_parceira
-- orientador -> coordenador_tecnico_icca

ALTER TABLE public.projects 
RENAME COLUMN proponent_name TO empresa_parceira;

ALTER TABLE public.projects 
RENAME COLUMN orientador TO coordenador_tecnico_icca;

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.projects.empresa_parceira IS 'Empresa parceira do projeto temático';
COMMENT ON COLUMN public.projects.coordenador_tecnico_icca IS 'Coordenador técnico ICCA (opcional)';