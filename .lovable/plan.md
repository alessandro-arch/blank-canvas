
# Padronizar Envio de Relatórios no Formulário Digital

## Contexto

O sistema possui dois fluxos paralelos de relatórios:
- **Antigo**: tabela `reports` com upload manual de PDF (via `ReportUploadDialog` e `InstallmentsTable`)
- **Novo**: tabelas `monthly_reports` + `monthly_report_fields` com formulário digital estruturado (via `MonthlyReportForm` e `MonthlyReportSection`)

O objetivo é migrar todos os bolsistas para o novo fluxo, desabilitando o upload manual de PDF e orientando o reenvio via formulário digital.

---

## Escopo das Alteracoes

### 1. Migracoes de Banco de Dados

Adicionar coluna `reenvio_solicitado` na tabela `reports` para marcar relatórios antigos que precisam ser reenviados no novo formato:

```text
ALTER TABLE public.reports 
  ADD COLUMN IF NOT EXISTS reenvio_solicitado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reenvio_solicitado_at timestamptz,
  ADD COLUMN IF NOT EXISTS reenvio_solicitado_by uuid,
  ADD COLUMN IF NOT EXISTS monthly_report_id uuid REFERENCES monthly_reports(id);
```

A coluna `monthly_report_id` vincula o relatório antigo ao novo relatório digital que o substituiu.

### 2. Desabilitar Upload Manual de PDF (Bolsista)

**Arquivo**: `src/components/scholar/InstallmentsTable.tsx`

- No componente `InstallmentActions`, substituir o botão "Enviar" / "Reenviar" que abre o `ReportUploadDialog` por uma orientacao para usar o formulário digital
- Quando `canSubmitReport` ou `canResubmit` for verdadeiro, em vez de abrir `ReportUploadDialog`, redirecionar ou orientar o bolsista a usar a seção "Relatório Mensal" (formulário digital)
- Manter o botao de upload apenas para relatórios que ja possuem status `approved` (historico) -- esses nao precisam de reenvio

### 3. Alerta de Reenvio Solicitado (Bolsista)

**Arquivo**: `src/components/scholar/monthly-report/MonthlyReportSection.tsx`

- Consultar a tabela `reports` para verificar se existem relatórios com `reenvio_solicitado = true` e `monthly_report_id IS NULL` para o bolsista no mesmo período
- Exibir um banner de alerta informando que o gestor solicitou o reenvio no novo formato digital
- Mostrar informacoes do relatório antigo (mes de referencia, feedback do gestor) para contextualizar

**Novo componente**: `src/components/scholar/monthly-report/ResubmitAlertBanner.tsx`

- Banner com icone de alerta, descricao do motivo e botao para iniciar o preenchimento no formulário

### 4. Fluxo de Submissao via Formulário com PDF Automatico

O fluxo ja existe (Fases 1-5 implementadas anteriormente):
- Bolsista preenche o formulário digital
- Ao submeter, o sistema gera PDF automaticamente via `generate-monthly-report-pdf`
- Nenhuma alteracao necessaria nesta etapa

### 5. Vincular Reenvio ao Relatório Antigo

**Arquivo**: `src/hooks/useMonthlyReport.ts`

- Apos submissao bem-sucedida do relatório mensal, verificar se existe um `report` antigo com `reenvio_solicitado = true` para o mesmo periodo
- Se existir, atualizar o registro antigo:
  - `monthly_report_id` = id do novo relatório
  - `status` = `'replaced_by_digital'` (novo status)
- Registrar no `audit_logs` a substituicao

### 6. Acao do Gestor: Solicitar Reenvio Digital

**Arquivo**: `src/components/dashboard/ReportsReviewManagement.tsx`

- Adicionar botao "Solicitar reenvio digital" no painel de revisao de relatórios antigos
- Ao clicar, marcar o `report` como `reenvio_solicitado = true` com timestamp e user_id
- Registrar no audit log

---

## Detalhes Tecnicos

### Migracoes SQL

```text
-- Novas colunas em reports
ALTER TABLE public.reports 
  ADD COLUMN IF NOT EXISTS reenvio_solicitado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reenvio_solicitado_at timestamptz,
  ADD COLUMN IF NOT EXISTS reenvio_solicitado_by uuid,
  ADD COLUMN IF NOT EXISTS monthly_report_id uuid REFERENCES public.monthly_reports(id);

CREATE INDEX IF NOT EXISTS idx_reports_reenvio 
  ON public.reports (user_id, reenvio_solicitado) 
  WHERE reenvio_solicitado = true;
```

### Arquivos a Criar
- `src/components/scholar/monthly-report/ResubmitAlertBanner.tsx`

### Arquivos a Editar
- `src/components/scholar/InstallmentsTable.tsx` -- desabilitar upload manual, redirecionar para formulário digital
- `src/components/scholar/monthly-report/MonthlyReportSection.tsx` -- exibir alerta de reenvio solicitado
- `src/hooks/useMonthlyReport.ts` -- vincular relatório antigo apos submissao
- `src/components/dashboard/ReportsReviewManagement.tsx` -- botao de solicitar reenvio digital
- `src/integrations/supabase/types.ts` -- atualizado automaticamente

### Fluxo Completo

```text
Gestor clica "Solicitar reenvio digital"
  -> reports.reenvio_solicitado = true
  -> Bolsista ve alerta no painel
  -> Bolsista preenche formulário digital
  -> Submissao gera PDF automatico
  -> reports.monthly_report_id = novo ID
  -> reports.status = 'replaced_by_digital'
  -> Historico registrado em audit_logs
```
