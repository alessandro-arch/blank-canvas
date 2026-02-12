
CREATE OR REPLACE FUNCTION public.notify_new_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_sender_name text;
BEGIN
  -- Get sender name
  SELECT COALESCE(full_name, 'Gestor') INTO v_sender_name
  FROM public.profiles
  WHERE user_id = NEW.sender_id
  LIMIT 1;

  -- Insert notification for recipient
  INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id)
  VALUES (
    NEW.recipient_id,
    'Nova Mensagem',
    'Você recebeu uma mensagem de ' || v_sender_name || ': ' || LEFT(NEW.subject, 50),
    'info',
    'message',
    NEW.id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();
