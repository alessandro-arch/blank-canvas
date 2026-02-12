
-- Create a function that sends email for system messages after they are inserted
-- This is called via pg_net to the send-system-email edge function
-- For now, we'll handle email sending in the triggers themselves or via a lightweight approach

-- Actually, the report/payment triggers already create the messages.
-- We need a separate mechanism to send emails for those system messages.
-- The cleanest approach: create an edge function that processes unsent system messages.

-- Add a trigger that calls pg_net to send email for new system messages
CREATE OR REPLACE FUNCTION public.queue_system_message_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_profile record;
  v_org_settings jsonb;
  v_email_enabled boolean := true;
BEGIN
  -- Only process SYSTEM messages
  IF NEW.type <> 'SYSTEM' THEN
    RETURN NEW;
  END IF;

  -- Get recipient email
  SELECT email, full_name INTO v_profile
  FROM public.profiles
  WHERE user_id = NEW.recipient_id
  LIMIT 1;

  IF v_profile IS NULL OR v_profile.email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check org email setting
  IF NEW.organization_id IS NOT NULL THEN
    SELECT settings INTO v_org_settings
    FROM public.organizations
    WHERE id = NEW.organization_id;
    
    IF v_org_settings IS NOT NULL AND (v_org_settings->>'email_notifications_enabled') = 'false' THEN
      v_email_enabled := false;
    END IF;
  END IF;

  IF NOT v_email_enabled THEN
    RETURN NEW;
  END IF;

  -- Queue email via pg_net
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
    -- Don't fail the transaction if email queueing fails
    RAISE WARNING 'Failed to queue system email: %', SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER queue_email_on_system_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  WHEN (NEW.type = 'SYSTEM')
  EXECUTE FUNCTION public.queue_system_message_email();
