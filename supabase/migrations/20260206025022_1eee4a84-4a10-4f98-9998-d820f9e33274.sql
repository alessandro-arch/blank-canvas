-- Função para mascarar chave PIX (não requer SECURITY DEFINER pois não acessa dados sensíveis)
CREATE OR REPLACE FUNCTION public.mask_pix_key(pix text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v text := COALESCE(TRIM(pix), '');
  n int := LENGTH(v);
BEGIN
  IF v = '' THEN
    RETURN NULL;
  END IF;

  -- Email: mantém 2 primeiros chars + domínio
  IF POSITION('@' IN v) > 1 THEN
    RETURN LEFT(v, 2) || '***' || SUBSTRING(v FROM POSITION('@' IN v));
  END IF;

  -- Telefone/CPF: mantém 2 primeiros e 2 últimos
  IF n <= 4 THEN
    RETURN REPEAT('*', n);
  END IF;

  RETURN LEFT(v, 2) || REPEAT('*', GREATEST(n - 4, 1)) || RIGHT(v, 2);
END;
$$;

-- Função para obter a chave de criptografia do Vault (SECURITY DEFINER para acessar vault)
CREATE OR REPLACE FUNCTION public.get_pix_key_secret()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT decrypted_secret
  FROM vault.decrypted_secrets
  WHERE name = 'PIX_KEY_ENCRYPTION_KEY'
  LIMIT 1;
$$;

-- Restringe acesso à função de segredo
REVOKE ALL ON FUNCTION public.get_pix_key_secret() FROM PUBLIC;