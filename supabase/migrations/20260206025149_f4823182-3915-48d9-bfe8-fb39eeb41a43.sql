-- Função para criptografar chave PIX usando AES-256
-- Usa extensions.pgp_sym_encrypt pois pgcrypto está no schema extensions
CREATE OR REPLACE FUNCTION public.encrypt_pix_key(pix text)
RETURNS bytea
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    CASE
      WHEN pix IS NULL OR BTRIM(pix) = '' THEN NULL
      ELSE extensions.pgp_sym_encrypt(pix, public.get_pix_key_secret(), 'compress-algo=1, cipher-algo=aes256')
    END;
$$;

-- Restringe acesso à função de criptografia
REVOKE ALL ON FUNCTION public.encrypt_pix_key(text) FROM PUBLIC;