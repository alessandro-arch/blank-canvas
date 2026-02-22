
-- Add encrypted columns for CPF and phone
ALTER TABLE public.profiles_sensitive
  ADD COLUMN IF NOT EXISTS cpf_enc text,
  ADD COLUMN IF NOT EXISTS phone_enc text;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles_sensitive.cpf_enc IS 'AES-256-GCM encrypted CPF in format base64(iv).base64(tag).base64(ciphertext)';
COMMENT ON COLUMN public.profiles_sensitive.phone_enc IS 'AES-256-GCM encrypted phone in format base64(iv).base64(tag).base64(ciphertext)';

-- Update the upsert_sensitive_profile RPC to also store encrypted versions
-- The RPC will continue to work for backward compat but plaintext columns
-- will be deprecated in favor of encrypted columns via Edge Functions
