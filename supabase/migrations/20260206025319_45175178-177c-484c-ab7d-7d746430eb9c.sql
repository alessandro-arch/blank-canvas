-- Função para descriptografar chave PIX (apenas para gestores/admins)
-- Usa extensions.pgp_sym_decrypt pois pgcrypto está no schema extensions
CREATE OR REPLACE FUNCTION public.decrypt_pix_key(p_bank_account_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_encrypted bytea;
  v_owner uuid;
  v_secret text;
BEGIN
  -- Bloquear anon explicitamente
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Buscar registro
  SELECT ba.pix_key_encrypted, ba.user_id
    INTO v_encrypted, v_owner
  FROM public.bank_accounts ba
  WHERE ba.id = p_bank_account_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bank account not found';
  END IF;

  -- Regra: somente manager/admin podem ver PIX completo
  IF NOT (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  IF v_encrypted IS NULL THEN
    RETURN NULL;
  END IF;

  v_secret := public.get_pix_key_secret();
  IF v_secret IS NULL OR v_secret = '' THEN
    RAISE EXCEPTION 'PIX_KEY_ENCRYPTION_KEY not configured in Vault';
  END IF;

  RETURN extensions.pgp_sym_decrypt(v_encrypted, v_secret);
END;
$$;

-- Restringe acesso e concede apenas para usuários autenticados
REVOKE ALL ON FUNCTION public.decrypt_pix_key(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decrypt_pix_key(uuid) TO authenticated;