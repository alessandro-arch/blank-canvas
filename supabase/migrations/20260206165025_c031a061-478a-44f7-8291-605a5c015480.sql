-- Add receipt_url column to payments table
ALTER TABLE public.payments 
ADD COLUMN receipt_url text;

-- Create storage bucket for payment receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for payment receipts bucket
-- Managers/Admins can upload receipts
CREATE POLICY "Managers can upload payment receipts"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'payment-receipts' 
  AND (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Managers/Admins can view all receipts
CREATE POLICY "Managers can view all payment receipts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payment-receipts' 
  AND (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Scholars can view their own receipts (using folder structure: payment-receipts/{user_id}/...)
CREATE POLICY "Scholars can view their own payment receipts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payment-receipts' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Managers/Admins can delete receipts
CREATE POLICY "Managers can delete payment receipts"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'payment-receipts' 
  AND (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Managers/Admins can update receipts
CREATE POLICY "Managers can update payment receipts"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'payment-receipts' 
  AND (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);