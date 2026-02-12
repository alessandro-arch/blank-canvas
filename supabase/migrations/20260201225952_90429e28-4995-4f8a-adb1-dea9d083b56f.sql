-- Create enum for bank data validation status
CREATE TYPE public.bank_validation_status AS ENUM ('pending', 'under_review', 'validated', 'returned');

-- Add validation columns to bank_accounts table
ALTER TABLE public.bank_accounts
ADD COLUMN validation_status public.bank_validation_status NOT NULL DEFAULT 'pending',
ADD COLUMN locked_for_edit boolean NOT NULL DEFAULT false,
ADD COLUMN validated_by uuid REFERENCES auth.users(id),
ADD COLUMN validated_at timestamp with time zone,
ADD COLUMN notes_gestor text;

-- Create index for faster filtering by status
CREATE INDEX idx_bank_accounts_validation_status ON public.bank_accounts(validation_status);

-- Update RLS policy for managers to update bank accounts (for validation)
CREATE POLICY "Managers can update bank accounts for validation"
ON public.bank_accounts
FOR UPDATE
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Update the user update policy to respect locked_for_edit
DROP POLICY IF EXISTS "Users can update their own bank account" ON public.bank_accounts;
CREATE POLICY "Users can update their own bank account when not locked"
ON public.bank_accounts
FOR UPDATE
USING (auth.uid() = user_id AND locked_for_edit = false)
WITH CHECK (auth.uid() = user_id AND locked_for_edit = false);