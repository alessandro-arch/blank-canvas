-- Add observacoes field to projects table for additional notes
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS observacoes text;

-- Add comment documenting the field
COMMENT ON COLUMN public.projects.observacoes IS 'Observações adicionais sobre o projeto temático';