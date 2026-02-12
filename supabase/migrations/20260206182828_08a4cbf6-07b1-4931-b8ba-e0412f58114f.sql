-- Create table for institutional/general documents available to all scholars
CREATE TABLE public.institutional_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('manual', 'template', 'termo')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.institutional_documents ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view documents
CREATE POLICY "All authenticated users can view institutional documents"
ON public.institutional_documents
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only managers/admins can insert
CREATE POLICY "Managers can insert institutional documents"
ON public.institutional_documents
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Only managers/admins can update
CREATE POLICY "Managers can update institutional documents"
ON public.institutional_documents
FOR UPDATE
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete
CREATE POLICY "Admins can delete institutional documents"
ON public.institutional_documents
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_institutional_documents_updated_at
BEFORE UPDATE ON public.institutional_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for institutional documents (public for reading)
INSERT INTO storage.buckets (id, name, public)
VALUES ('institutional-documents', 'institutional-documents', true);

-- Storage policies for institutional-documents bucket
CREATE POLICY "Anyone can view institutional documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'institutional-documents');

CREATE POLICY "Managers can upload institutional documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'institutional-documents' 
  AND (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Managers can update institutional documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'institutional-documents' 
  AND (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Admins can delete institutional documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'institutional-documents' 
  AND has_role(auth.uid(), 'admin'::app_role)
);