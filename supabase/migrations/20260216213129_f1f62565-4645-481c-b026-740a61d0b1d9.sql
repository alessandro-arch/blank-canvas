
CREATE OR REPLACE FUNCTION public.notify_news_published()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  -- Only notify when publishing (insert with is_published=true or update from false to true)
  IF NEW.is_published = true AND (TG_OP = 'INSERT' OR OLD.is_published = false) THEN
    INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id)
    SELECT 
      p.user_id,
      'Nova Publicação',
      'Nova notícia: ' || LEFT(NEW.title, 80),
      'info',
      'news',
      NEW.id
    FROM public.profiles p
    WHERE p.is_active = true
      AND p.user_id IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_news_published
  AFTER INSERT OR UPDATE OF is_published ON public.news_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_news_published();
