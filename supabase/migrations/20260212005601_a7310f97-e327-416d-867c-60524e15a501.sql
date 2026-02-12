
-- Tabela de mensagens (gestor → bolsista)
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages FORCE ROW LEVEL SECURITY;

-- Policies: Recipients can read their own messages
CREATE POLICY "messages_select_own"
  ON public.messages FOR SELECT
  USING (recipient_id = auth.uid());

-- Managers/admins can see messages they sent
CREATE POLICY "messages_select_sent"
  ON public.messages FOR SELECT
  USING (sender_id = auth.uid() AND (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

-- Only managers/admins can send messages
CREATE POLICY "messages_insert_manager"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() 
    AND (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  );

-- Recipients can update (mark as read)
CREATE POLICY "messages_update_own"
  ON public.messages FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Block anonymous access
CREATE POLICY "messages_deny_anon"
  ON public.messages FOR SELECT
  USING (false);

-- Block deletes
-- (no DELETE policy = no one can delete)

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Tabela de templates de mensagens
CREATE TABLE public.message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  organization_id UUID REFERENCES public.organizations(id),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- Only managers/admins can manage templates
CREATE POLICY "templates_select_manager"
  ON public.message_templates FOR SELECT
  USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "templates_insert_manager"
  ON public.message_templates FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "templates_update_manager"
  ON public.message_templates FOR UPDATE
  USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "templates_delete_manager"
  ON public.message_templates FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir templates padrão
INSERT INTO public.message_templates (name, subject, body, category, created_by) VALUES
  ('Lembrete de Relatório', 'Lembrete: Envio de Relatório Mensal', 'Prezado(a) bolsista,

Lembramos que o prazo para envio do relatório mensal está se aproximando. Por favor, acesse a plataforma BolsaGO e envie seu relatório o mais breve possível.

Em caso de dúvidas, entre em contato conosco.

Atenciosamente,
Equipe de Gestão', 'lembrete', '00000000-0000-0000-0000-000000000000'),

  ('Pendência Bancária', 'Ação Necessária: Dados Bancários Pendentes', 'Prezado(a) bolsista,

Identificamos que seus dados bancários ainda estão pendentes de validação. Para que o pagamento da sua bolsa seja processado, é necessário que você atualize ou confirme suas informações bancárias na plataforma BolsaGO.

Atenciosamente,
Equipe de Gestão', 'pendencia', '00000000-0000-0000-0000-000000000000'),

  ('Relatório Aprovado', 'Seu Relatório Foi Aprovado!', 'Prezado(a) bolsista,

Temos o prazer de informar que seu relatório mensal foi aprovado com sucesso. O pagamento correspondente será processado em breve.

Parabéns pelo trabalho e continue assim!

Atenciosamente,
Equipe de Gestão', 'aprovacao', '00000000-0000-0000-0000-000000000000'),

  ('Boas-vindas', 'Bem-vindo(a) ao BolsaGO!', 'Prezado(a) bolsista,

Seja bem-vindo(a) à plataforma BolsaGO! Estamos felizes em tê-lo(a) conosco.

Através da plataforma, você poderá acompanhar sua bolsa, enviar relatórios mensais e consultar seus pagamentos.

Se precisar de ajuda, não hesite em entrar em contato.

Atenciosamente,
Equipe de Gestão', 'onboarding', '00000000-0000-0000-0000-000000000000');
