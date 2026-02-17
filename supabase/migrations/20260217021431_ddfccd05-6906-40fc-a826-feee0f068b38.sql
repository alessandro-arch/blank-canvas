
-- 1) Create pdf_logs table
CREATE TABLE public.pdf_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  entity_type text NOT NULL DEFAULT 'bolsa',
  entity_id uuid NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  generation_time_ms integer,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  organization_id uuid REFERENCES public.organizations(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pdf_logs ENABLE ROW LEVEL SECURITY;

-- Admins can see all
CREATE POLICY "pdf_logs_select_admin"
  ON public.pdf_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Managers can see org-scoped
CREATE POLICY "pdf_logs_select_manager"
  ON public.pdf_logs FOR SELECT
  USING (
    has_role(auth.uid(), 'manager'::app_role)
    AND (organization_id IN (SELECT get_user_organizations()))
  );

-- Own logs
CREATE POLICY "pdf_logs_select_own"
  ON public.pdf_logs FOR SELECT
  USING (user_id = auth.uid());

-- Insert by authenticated users (manager/admin)
CREATE POLICY "pdf_logs_insert_authenticated"
  ON public.pdf_logs FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );

-- 2) Create relatorios storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('relatorios', 'relatorios', false);

-- Storage policies: managers/admins can upload
CREATE POLICY "relatorios_insert_manager"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'relatorios'
    AND (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );

-- managers/admins can read
CREATE POLICY "relatorios_select_manager"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'relatorios'
    AND (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );

-- managers/admins can update (overwrite)
CREATE POLICY "relatorios_update_manager"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'relatorios'
    AND (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );

-- admins can delete
CREATE POLICY "relatorios_delete_admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'relatorios'
    AND has_role(auth.uid(), 'admin'::app_role)
  );
