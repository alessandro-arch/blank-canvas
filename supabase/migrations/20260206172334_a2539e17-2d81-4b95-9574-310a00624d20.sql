-- Create trigger to automatically encrypt PIX key and generate masked version on insert/update
CREATE OR REPLACE FUNCTION public.encrypt_and_mask_pix_key()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  -- If pix_key_masked is being set (from application), use it as the source for encryption
  IF NEW.pix_key_masked IS NOT NULL AND NEW.pix_key_masked <> '' AND 
     (TG_OP = 'INSERT' OR OLD.pix_key_masked IS DISTINCT FROM NEW.pix_key_masked) THEN
    -- Check if the value looks like a masked value (contains ***) - if so, don't re-encrypt
    IF POSITION('***' IN NEW.pix_key_masked) = 0 THEN
      -- This is a new PIX key value, encrypt it and mask it
      NEW.pix_key_encrypted := public.encrypt_pix_key(NEW.pix_key_masked);
      NEW.pix_key_masked := public.mask_pix_key(NEW.pix_key_masked);
    END IF;
  END IF;
  
  -- Ensure pix_key column (plain text) is always NULL to prevent plain text storage
  NEW.pix_key := NULL;
  
  RETURN NEW;
END;
$$;

-- Create trigger for bank_accounts table
DROP TRIGGER IF EXISTS trg_encrypt_pix_key ON public.bank_accounts;
CREATE TRIGGER trg_encrypt_pix_key
  BEFORE INSERT OR UPDATE ON public.bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_and_mask_pix_key();