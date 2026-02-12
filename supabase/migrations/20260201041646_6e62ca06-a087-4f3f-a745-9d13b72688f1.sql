-- Criar enum para modalidades de bolsa
CREATE TYPE public.grant_modality AS ENUM ('ic', 'masters', 'phd', 'postdoc', 'technical');

-- Criar enum para status de vínculo
CREATE TYPE public.enrollment_status AS ENUM ('active', 'suspended', 'completed', 'cancelled');

-- Criar enum para status de pagamento
CREATE TYPE public.payment_status AS ENUM ('pending', 'eligible', 'paid', 'cancelled');

-- Tabela de Projetos
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  proponent_name TEXT NOT NULL,
  proponent_email TEXT,
  proponent_cpf TEXT,
  modalities grant_modality[] DEFAULT '{}',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de Dados Bancários (isolada de profiles por segurança)
CREATE TABLE public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_code TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  agency TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_type TEXT DEFAULT 'checking',
  pix_key TEXT,
  pix_key_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Tabela de Vínculos (Enrollments/Grants)
CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  modality grant_modality NOT NULL,
  grant_value DECIMAL(10,2) NOT NULL CHECK (grant_value > 0),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_installments INTEGER NOT NULL CHECK (total_installments > 0),
  status enrollment_status NOT NULL DEFAULT 'active',
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_enrollment_dates CHECK (end_date > start_date)
);

-- Tabela de Pagamentos/Parcelas
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL CHECK (installment_number > 0),
  reference_month TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  status payment_status NOT NULL DEFAULT 'pending',
  report_id UUID REFERENCES public.reports(id),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(enrollment_id, installment_number)
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Políticas para PROJECTS
CREATE POLICY "Managers can view all projects"
ON public.projects FOR SELECT
USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can insert projects"
ON public.projects FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can update projects"
ON public.projects FOR UPDATE
USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can delete projects"
ON public.projects FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Scholars can view their projects"
ON public.projects FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE enrollments.project_id = projects.id
    AND enrollments.user_id = auth.uid()
  )
);

-- Políticas para BANK_ACCOUNTS
CREATE POLICY "Users can view their own bank account"
ON public.bank_accounts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank account"
ON public.bank_accounts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank account"
ON public.bank_accounts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all bank accounts"
ON public.bank_accounts FOR SELECT
USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

-- Políticas para ENROLLMENTS
CREATE POLICY "Scholars can view their own enrollments"
ON public.enrollments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all enrollments"
ON public.enrollments FOR SELECT
USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can insert enrollments"
ON public.enrollments FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can update enrollments"
ON public.enrollments FOR UPDATE
USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can delete enrollments"
ON public.enrollments FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para PAYMENTS
CREATE POLICY "Scholars can view their own payments"
ON public.payments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all payments"
ON public.payments FOR SELECT
USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can insert payments"
ON public.payments FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can update payments"
ON public.payments FOR UPDATE
USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin'));

-- Triggers para updated_at
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at
BEFORE UPDATE ON public.bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_enrollments_updated_at
BEFORE UPDATE ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_enrollments_user_id ON public.enrollments(user_id);
CREATE INDEX idx_enrollments_project_id ON public.enrollments(project_id);
CREATE INDEX idx_enrollments_status ON public.enrollments(status);
CREATE INDEX idx_payments_enrollment_id ON public.payments(enrollment_id);
CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_bank_accounts_user_id ON public.bank_accounts(user_id);