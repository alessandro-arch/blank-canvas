-- Add status enum for projects
CREATE TYPE public.project_status AS ENUM ('active', 'inactive', 'archived');

-- Add status column to projects table
ALTER TABLE public.projects 
ADD COLUMN status public.project_status NOT NULL DEFAULT 'active';

-- Create index for faster filtering by status
CREATE INDEX idx_projects_status ON public.projects(status);