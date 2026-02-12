CREATE OR REPLACE FUNCTION public.queue_system_message_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_email_enabled boolean := true;
BEGIN
  IF NEW.type <> 'SYSTEM' THEN
    RETURN NEW;
  END IF;

  SELECT email, full_name INTO v_profile
  FROM public.profiles
  WHERE user_id = NEW.recipient_id
  LIMIT 1;

  IF v_profile IS NULL OR v_profile.email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check org email_notifications_enabled column
  IF NEW.organization_id IS NOT NULL THEN
    SELECT o.email_notifications_enabled INTO v_email_enabled
    FROM public.organizations o
    WHERE o.id = NEW.organization_id;
  END IF;

  IF NOT v_email_enabled THEN
    -- Just register in inbox, no email
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-system-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)
    ),
    body := jsonb_build_object(
      'message_id', NEW.id,
      'recipient_email', v_profile.email,
      'recipient_name', COALESCE(v_profile.full_name, 'Bolsista'),
      'subject', NEW.subject,
      'body', NEW.body
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to queue system email: %', SQLERRM;
    RETURN NEW;
END;
$$;