
-- 1. Add new columns to messages table
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id),
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'GESTOR',
  ADD COLUMN IF NOT EXISTS event_type text,
  ADD COLUMN IF NOT EXISTS link_url text;

-- Make sender_id nullable (system messages have no sender)
ALTER TABLE public.messages ALTER COLUMN sender_id DROP NOT NULL;

-- Add constraint for type
ALTER TABLE public.messages ADD CONSTRAINT messages_type_check
  CHECK (type IN ('SYSTEM', 'GESTOR'));

-- Add constraint for event_type  
ALTER TABLE public.messages ADD CONSTRAINT messages_event_type_check
  CHECK (event_type IS NULL OR event_type IN ('REPORT_SUBMITTED', 'REPORT_RETURNED', 'MONTHLY_REMINDER', 'PAYMENT_STATUS', 'GENERAL'));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_messages_recipient_read ON public.messages(recipient_id, read);
CREATE INDEX IF NOT EXISTS idx_messages_org_id ON public.messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_messages_type ON public.messages(type);

-- 2. Add email_log columns to track email delivery
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS email_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS email_error text DEFAULT NULL;

-- 3. Replace the report status trigger to also create inbox messages
CREATE OR REPLACE FUNCTION public.notify_report_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_title text;
  v_message text;
  v_type text;
  v_event_type text;
  v_org_id uuid;
  v_link_url text;
BEGIN
  -- Only trigger on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get org_id from the scholar's enrollment -> project -> thematic_project
  SELECT tp.organization_id INTO v_org_id
  FROM public.enrollments e
  JOIN public.projects p ON e.project_id = p.id
  JOIN public.thematic_projects tp ON p.thematic_project_id = tp.id
  WHERE e.user_id = NEW.user_id
  LIMIT 1;

  v_link_url := '/bolsista/perfil';

  -- Determine notification content based on new status
  CASE NEW.status
    WHEN 'approved' THEN
      v_title := 'Relatório Aprovado';
      v_message := 'Seu relatório de ' || NEW.reference_month || ' foi aprovado!';
      v_type := 'success';
      v_event_type := NULL;
    WHEN 'rejected' THEN
      v_title := 'Relatório Devolvido para Ajustes';
      v_message := 'Seu relatório de ' || NEW.reference_month || ' foi devolvido para ajustes.';
      IF NEW.feedback IS NOT NULL AND NEW.feedback <> '' THEN
        v_message := v_message || ' Observações: ' || LEFT(NEW.feedback, 200);
      END IF;
      v_type := 'error';
      v_event_type := 'REPORT_RETURNED';
    WHEN 'under_review' THEN
      v_title := 'Relatório Enviado com Sucesso';
      v_message := 'Seu relatório de ' || NEW.reference_month || ' foi enviado e está em análise.';
      v_type := 'info';
      v_event_type := 'REPORT_SUBMITTED';
    ELSE
      RETURN NEW;
  END CASE;

  -- Insert notification (bell)
  INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id)
  VALUES (NEW.user_id, v_title, v_message, v_type, 'report', NEW.id);

  -- Insert inbox message (system)
  INSERT INTO public.messages (recipient_id, sender_id, subject, body, type, event_type, link_url, organization_id)
  VALUES (NEW.user_id, NULL, v_title, v_message, 'SYSTEM', v_event_type, v_link_url, v_org_id);

  RETURN NEW;
END;
$$;

-- 4. Update payment trigger to also create inbox messages
CREATE OR REPLACE FUNCTION public.notify_payment_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_title text;
  v_message text;
  v_type text;
  v_org_id uuid;
BEGIN
  -- Only trigger on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get org_id
  SELECT tp.organization_id INTO v_org_id
  FROM public.enrollments e
  JOIN public.projects p ON e.project_id = p.id
  JOIN public.thematic_projects tp ON p.thematic_project_id = tp.id
  WHERE e.user_id = NEW.user_id
  LIMIT 1;

  CASE NEW.status
    WHEN 'eligible' THEN
      v_title := 'Pagamento Liberado';
      v_message := 'O pagamento da parcela ' || NEW.installment_number || ' (' || NEW.reference_month || ') foi liberado!';
      v_type := 'success';
    WHEN 'paid' THEN
      v_title := 'Pagamento Efetuado';
      v_message := 'A parcela ' || NEW.installment_number || ' (' || NEW.reference_month || ') foi paga com sucesso!';
      v_type := 'success';
    WHEN 'cancelled' THEN
      v_title := 'Pagamento Cancelado';
      v_message := 'A parcela ' || NEW.installment_number || ' (' || NEW.reference_month || ') foi cancelada.';
      v_type := 'warning';
    ELSE
      RETURN NEW;
  END CASE;

  -- Insert notification (bell)
  INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id)
  VALUES (NEW.user_id, v_title, v_message, v_type, 'payment', NEW.id);

  -- Insert inbox message (system)
  INSERT INTO public.messages (recipient_id, sender_id, subject, body, type, event_type, link_url, organization_id)
  VALUES (NEW.user_id, NULL, v_title, v_message, 'SYSTEM', 'PAYMENT_STATUS', '/bolsista/perfil', v_org_id);

  RETURN NEW;
END;
$$;

-- 5. Allow system messages (sender_id NULL) via RLS update
-- Drop and recreate insert policy to allow system inserts (via SECURITY DEFINER triggers)
-- The existing policy requires sender_id = auth.uid(), but system messages have NULL sender
-- Triggers use SECURITY DEFINER so they bypass RLS, no policy change needed

-- 6. Add email_enabled to org settings (already jsonb, just document convention)
-- org.settings->>'email_notifications_enabled' = 'true'
