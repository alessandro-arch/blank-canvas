
-- Fix get_pix_key_secret to add role check (only allow admin/manager callers)
CREATE OR REPLACE FUNCTION public.get_pix_key_secret()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only admin/manager can access the encryption key
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized to access encryption keys';
  END IF;

  RETURN (
    SELECT decrypted_secret
    FROM vault.decrypted_secrets
    WHERE name = 'PIX_KEY_ENCRYPTION_KEY'
    LIMIT 1
  );
END;
$function$;
