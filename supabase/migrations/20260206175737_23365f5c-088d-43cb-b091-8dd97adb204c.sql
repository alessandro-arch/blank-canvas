-- Create table to store grant term documents (one per scholar)
CREATE TABLE public.grant_terms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  signed_at date NOT NULL,
  uploaded_by uuid NOT NULL,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.grant_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grant_terms FORCE ROW LEVEL SECURITY;

-- Scholars can view their own grant term
CREATE POLICY "grant_terms_select_own"
ON public.grant_terms
FOR SELECT
USING (user_id = auth.uid());

-- Managers/admins can view all grant terms
CREATE POLICY "grant_terms_select_manager"
ON public.grant_terms
FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Managers/admins can insert grant terms
CREATE POLICY "grant_terms_insert_manager"
ON public.grant_terms
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Managers/admins can update grant terms (to replace document)
CREATE POLICY "grant_terms_update_manager"
ON public.grant_terms
FOR UPDATE
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete grant terms
CREATE POLICY "grant_terms_delete_admin"
ON public.grant_terms
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_grant_terms_updated_at
BEFORE UPDATE ON public.grant_terms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for grant terms (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('grant-terms', 'grant-terms', false);

-- Storage policies for grant-terms bucket
-- Managers/admins can upload
CREATE POLICY "grant_terms_storage_insert"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'grant-terms' AND 
  (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Managers/admins can view all
CREATE POLICY "grant_terms_storage_select_manager"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'grant-terms' AND 
  (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Scholars can view their own (path starts with their user_id)
CREATE POLICY "grant_terms_storage_select_own"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'grant-terms' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Managers/admins can update/replace
CREATE POLICY "grant_terms_storage_update"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'grant-terms' AND 
  (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Admins can delete
CREATE POLICY "grant_terms_storage_delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'grant-terms' AND 
  has_role(auth.uid(), 'admin'::app_role)
);