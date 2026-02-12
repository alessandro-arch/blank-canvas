-- Create notifications table
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  entity_type text,
  entity_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read);

-- RLS policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert notifications for users"
ON public.notifications
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications
FOR DELETE
USING (auth.uid() = user_id);

-- Managers/Admins can insert notifications (for status changes)
CREATE POLICY "Managers can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create function to create notification on report status change
CREATE OR REPLACE FUNCTION public.notify_report_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_title text;
  v_message text;
  v_type text;
BEGIN
  -- Only trigger on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Determine notification content based on new status
  CASE NEW.status
    WHEN 'approved' THEN
      v_title := 'Relatório Aprovado';
      v_message := 'Seu relatório de ' || NEW.reference_month || ' foi aprovado!';
      v_type := 'success';
    WHEN 'rejected' THEN
      v_title := 'Relatório Recusado';
      v_message := 'Seu relatório de ' || NEW.reference_month || ' foi recusado. Verifique o feedback.';
      v_type := 'error';
    WHEN 'under_review' THEN
      v_title := 'Relatório em Análise';
      v_message := 'Seu relatório de ' || NEW.reference_month || ' está em análise.';
      v_type := 'info';
    ELSE
      RETURN NEW;
  END CASE;

  -- Insert notification
  INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id)
  VALUES (NEW.user_id, v_title, v_message, v_type, 'report', NEW.id);

  RETURN NEW;
END;
$$;

-- Create trigger for report status changes
CREATE TRIGGER trigger_notify_report_status_change
AFTER UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.notify_report_status_change();

-- Create function to create notification on payment status change
CREATE OR REPLACE FUNCTION public.notify_payment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_title text;
  v_message text;
  v_type text;
BEGIN
  -- Only trigger on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Determine notification content based on new status
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

  -- Insert notification
  INSERT INTO public.notifications (user_id, title, message, type, entity_type, entity_id)
  VALUES (NEW.user_id, v_title, v_message, v_type, 'payment', NEW.id);

  RETURN NEW;
END;
$$;

-- Create trigger for payment status changes
CREATE TRIGGER trigger_notify_payment_status_change
AFTER UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.notify_payment_status_change();