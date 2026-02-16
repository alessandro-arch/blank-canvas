
-- Create news_posts table
CREATE TABLE public.news_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text,
  content text NOT NULL,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.news_posts ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read published news (global or their org)
CREATE POLICY "news_select_published" ON public.news_posts
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND is_published = true
    AND (organization_id IS NULL OR user_has_org_access(organization_id))
  );

-- Admins/managers can manage
CREATE POLICY "news_insert_manager" ON public.news_posts
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "news_update_manager" ON public.news_posts
  FOR UPDATE USING (
    has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "news_delete_admin" ON public.news_posts
  FOR DELETE USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Trigger for updated_at
CREATE TRIGGER update_news_posts_updated_at
  BEFORE UPDATE ON public.news_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create help_articles table
CREATE TABLE public.help_articles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  category text NOT NULL,
  content text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read published articles
CREATE POLICY "help_select_published" ON public.help_articles
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_published = true);

CREATE POLICY "help_insert_admin" ON public.help_articles
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "help_update_admin" ON public.help_articles
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "help_delete_admin" ON public.help_articles
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_help_articles_updated_at
  BEFORE UPDATE ON public.help_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed help articles
INSERT INTO public.help_articles (title, category, content, sort_order) VALUES
('O que é o BolsaGo?', 'Primeiros passos', 'O BolsaGo é a plataforma de gestão de bolsas da InnovaGO. Aqui você pode acompanhar seus pagamentos; enviar relatórios; gerenciar documentos e se comunicar com a gestão do programa.', 1),
('Como enviar meu relatório mensal?', 'Relatórios', 'Acesse o menu "Pagamentos e Relatórios" no painel do bolsista. Clique em "Enviar Relatório" na parcela correspondente; selecione o arquivo PDF e confirme o envio. O relatório será analisado pela gestão.', 2),
('Como atualizar meus dados bancários?', 'Conta', 'Acesse seu perfil e clique em "Dados Bancários". Preencha os campos solicitados. Após o envio; seus dados serão validados pela equipe gestora antes da liberação de pagamentos.', 3),
('Como funciona o sistema de mensagens?', 'Mensagens', 'Você pode receber mensagens da gestão e do sistema. Acesse a Central (botão no canto inferior direito) e vá até a aba "Mensagens" para ver suas conversas e enviar novas mensagens.', 4),
('Política de segurança e LGPD', 'Segurança', 'Seus dados pessoais são tratados em conformidade com a Lei Geral de Proteção de Dados (LGPD). Dados sensíveis como CPF são armazenados de forma criptografada. Apenas usuários autorizados têm acesso às informações necessárias para a gestão do programa.', 5);

-- Seed news posts (global)
INSERT INTO public.news_posts (title, summary, content, is_published, published_at, created_by) VALUES
('Bem-vindo ao BolsaGo', 'A plataforma de gestão de bolsas da InnovaGO está no ar.', 'Estamos felizes em anunciar o lançamento do BolsaGo; a plataforma oficial de gestão de bolsas da InnovaGO. Aqui você encontra todas as ferramentas para acompanhar seus pagamentos; enviar relatórios e se comunicar com a equipe gestora.', true, now(), '00000000-0000-0000-0000-000000000000'),
('Prazo para envio de relatórios', 'Fique atento ao prazo mensal de envio dos relatórios de atividades.', 'Lembramos que os relatórios mensais devem ser enviados até o dia 25 de cada mês. Relatórios enviados após essa data podem impactar a liberação do pagamento da parcela correspondente. Em caso de dúvidas; entre em contato com a gestão pelo sistema de mensagens.', true, now(), '00000000-0000-0000-0000-000000000000');
