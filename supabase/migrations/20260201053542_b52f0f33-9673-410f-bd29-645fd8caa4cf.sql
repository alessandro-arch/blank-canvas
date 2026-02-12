-- Drop and recreate the grant_modality enum with new values
-- First, we need to update any columns that use this enum

-- Step 1: Remove default values and constraints temporarily
ALTER TABLE public.enrollments ALTER COLUMN modality DROP DEFAULT;
ALTER TABLE public.projects ALTER COLUMN modalities DROP DEFAULT;

-- Step 2: Change columns to text temporarily
ALTER TABLE public.enrollments ALTER COLUMN modality TYPE text;
ALTER TABLE public.projects ALTER COLUMN modalities TYPE text[];

-- Step 3: Drop the old enum
DROP TYPE IF EXISTS public.grant_modality;

-- Step 4: Create the new enum with updated values
CREATE TYPE public.grant_modality AS ENUM (
  'ict',        -- Bolsa de Iniciação Científica e Tecnológica
  'ext',        -- Bolsa de Extensão
  'ens',        -- Bolsa de Apoio ao Ensino
  'ino',        -- Bolsa de Inovação
  'dct_a',      -- Bolsa de Desenvolvimento Científico e Tecnológico (Nível A)
  'dct_b',      -- Bolsa de Desenvolvimento Científico e Tecnológico (Nível B)
  'dct_c',      -- Bolsa de Desenvolvimento Científico e Tecnológico (Nível C)
  'postdoc',    -- Bolsa de Pós-doutorado
  'senior',     -- Bolsa de Cientista Sênior
  'prod',       -- Bolsa de Produtividade em Pesquisa
  'visitor'     -- Bolsa de Pesquisador Visitante (Estrangeiro)
);

-- Step 5: Convert columns back to enum type
ALTER TABLE public.enrollments 
  ALTER COLUMN modality TYPE public.grant_modality 
  USING modality::public.grant_modality;

ALTER TABLE public.projects 
  ALTER COLUMN modalities TYPE public.grant_modality[] 
  USING modalities::public.grant_modality[];

-- Step 6: Restore default values
ALTER TABLE public.projects ALTER COLUMN modalities SET DEFAULT '{}'::grant_modality[];