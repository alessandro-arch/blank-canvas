
CREATE OR REPLACE FUNCTION public.notify_new_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  -- Insert notification for recipient (always use "Gestor" as sender label)
  INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id)
  VALUES (
    NEW.recipient_id,
    'Nova Mensagem',
    'Você recebeu uma mensagem de Gestor: ' || LEFT(NEW.subject, 50),
    'info',
    'message',
    NEW.id
  );

  RETURN NEW;
END;
$$;
