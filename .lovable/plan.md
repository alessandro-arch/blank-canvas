
# Relatório Mensal por Formulário Estruturado - Plano de Implementacao em 5 Fases

## Resumo Executivo

Transformar o fluxo atual de relatorio mensal (upload de PDF) para um formulario estruturado com rascunho, aceite eletronico, geracao de PDF auditavel, aprovacao pelo gestor e IA assistiva opcional. A implementacao sera feita em 5 fases incrementais, cada uma entregando valor independente.

---

## Visao Geral da Arquitetura

O sistema atual usa a tabela `reports` para armazenar uploads de PDF feitos pelo bolsista. O novo sistema criara tabelas dedicadas (`monthly_reports`, `monthly_report_fields`, `monthly_report_versions`, `monthly_report_documents`) e coexistira com o fluxo antigo ate a migracao completa.

```text
+-------------------+      +----------------------+      +------------------+
| Bolsista (React)  | ---> | Supabase DB          | ---> | Edge Function    |
| - Formulario      |      | - monthly_reports    |      | - Gerar PDF      |
| - Rascunho/Envio  |      | - monthly_report_*   |      | - SHA-256        |
|                   |      | - audit_logs         |      | - IA (Fase 4)    |
+-------------------+      +----------------------+      +------------------+
        |                           |
        v                           v
+-------------------+      +----------------------+
| Gestor (React)    |      | Supabase Storage     |
| - Avaliar         |      | - relatorios bucket  |
| - Aprovar/Devolver|      | - PDFs oficiais      |
+-------------------+      +----------------------+
```

---

## FASE 1 - Banco de Dados + Estados + Rascunho

### 1.1 Migracao SQL

Criar 4 novas tabelas com RLS:

**monthly_reports** (tabela principal)
- `id`, `organization_id`, `project_id`, `beneficiary_user_id`
- `period_year`, `period_month`
- `status` (draft, submitted, under_review, approved, returned, cancelled)
- `submitted_at`, `submitted_ip`, `submitted_user_agent`
- `locked_at`, `approved_at`, `approved_by_user_id`
- `returned_at`, `returned_by_user_id`, `return_reason`
- `created_at`, `updated_at`
- UNIQUE(beneficiary_user_id, project_id, period_year, period_month)

**monthly_report_fields** (conteudo do formulario)
- `id`, `report_id` (FK cascade), `payload` (jsonb), `updated_at`

**monthly_report_versions** (historico de alteracoes)
- `id`, `report_id`, `version`, `payload`, `changed_by_user_id`, `changed_at`, `change_summary`

**monthly_report_documents** (PDFs e arquivos oficiais)
- `id`, `report_id`, `type` (official_pdf, final_pdf, attachment), `storage_path`, `sha256`, `generated_at`, `generated_by_user_id`, `metadata` (jsonb)

### 1.2 Politicas RLS

- **Bolsista**: SELECT/INSERT/UPDATE nos proprios reports em status 'draft'; SELECT em todos os proprios reports
- **Gestor/Admin**: SELECT reports da sua organizacao; UPDATE via funcoes Security Definer
- Funcoes auxiliares: `monthly_report_belongs_to_user_org(report_id)` (SECURITY DEFINER)

### 1.3 Funcoes Security Definer

- `create_monthly_report_draft(project_id, year, month)` - cria rascunho com validacao de unicidade
- `save_monthly_report_draft(report_id, payload)` - salva conteudo do formulario (valida status=draft e autoria)

### 1.4 Novos tipos no Audit Log

Adicionar ao `useAuditLog.ts`:
- `report_draft_created`, `report_draft_saved`, `report_submitted`, `report_locked`, `report_pdf_generated`, `report_approved`, `report_returned`

### 1.5 UI do Bolsista - Formulario de Rascunho

**Novos componentes:**
- `src/components/scholar/monthly-report/MonthlyReportForm.tsx` - formulario principal com campos estruturados (atividades realizadas, resultados alcancados, dificuldades, proximos passos, horas dedicadas)
- `src/components/scholar/monthly-report/MonthlyReportStatusBadge.tsx` - badge de status
- `src/components/scholar/monthly-report/MonthlyReportActions.tsx` - botoes de acao

**Novo hook:**
- `src/hooks/useMonthlyReport.ts` - CRUD de rascunho, autosave (debounce 15s), submit

**Integracao na pagina existente:**
- Na pagina `PaymentsReports.tsx`, adicionar secao "Relatorio Mensal" acima ou abaixo da tabela de parcelas
- Manter o fluxo antigo de upload como fallback (feature flag ou condicional por organizacao)

**Comportamento:**
- Ao acessar, buscar ou criar rascunho para o mes vigente
- Salvar rascunho manualmente via botao "Salvar rascunho"
- Autosave a cada 15s quando em modo draft (com indicador visual "Salvo as HH:MM")
- Botao "Enviar relatorio" abre modal de confirmacao (Fase 2)
- Apos enviado: formulario em modo read-only, exibir data/hora do envio

---

## FASE 2 - Envio + Aceite Eletronico + PDF Oficial

### 2.1 Funcao Security Definer: `submit_monthly_report(report_id)`

- Valida status = 'draft'
- Registra `submitted_at`, `locked_at`
- Muda status para 'submitted'
- Cria snapshot em `monthly_report_versions`
- Registra em `audit_logs`
- Retorna sucesso

### 2.2 Edge Function: `generate-monthly-report-pdf`

- Recebe `report_id`
- Busca dados do formulario, perfil do bolsista, projeto
- Gera PDF com layout A4 retrato, paginacao automatica
- Rodape auditavel: plataforma, autor, email, periodo, data/hora UTC, hash SHA-256, status
- Calcula SHA-256 do PDF
- Salva no Storage: `relatorios/{org_id}/{project_id}/{user_id}/{year}-{month}/relatorio_oficial.pdf`
- Registra em `monthly_report_documents` e `audit_logs`

### 2.3 Modal de Aceite Eletronico

- `src/components/scholar/monthly-report/SubmitReportDialog.tsx`
- Checkbox obrigatorio: "Declaro que as informacoes sao verdadeiras e refletem as atividades realizadas."
- Botao "Confirmar e Enviar"
- Apos confirmacao: chama submit + dispara geracao de PDF
- Polling para verificar quando PDF esta pronto (reutilizar padrao existente do `generate-scholarship-pdf`)

### 2.4 Travamento de Edicao

- Frontend: formulario em modo read-only quando status != 'draft'
- Backend: funcao `save_monthly_report_draft` rejeita se status != 'draft'
- RLS: UPDATE bloqueado para status != 'draft' (via policy condition)

### 2.5 Fluxo de Devolucao e Reenvio

- Quando gestor devolve (status = 'returned'), bolsista pode "Reabrir para correcao"
- Funcao `reopen_monthly_report(report_id)` muda status para 'draft', permite edicao
- Ao reenviar, gera novo PDF com nova versao e novo hash
- Historico preservado em `monthly_report_versions` e `monthly_report_documents`

### 2.6 Configuracao Supabase

- Registrar `generate-monthly-report-pdf` em `supabase/config.toml` com `verify_jwt = false`
- Reutilizar bucket `relatorios` existente

---

## FASE 3 - Painel do Gestor

### 3.1 Refatorar "Avaliacao de Relatorios"

Adaptar `ReportsReviewManagement.tsx` para suportar tanto relatorios antigos (tabela `reports`) quanto novos (tabela `monthly_reports`):

- Filtro obrigatorio de MES/ANO (manter padrao existente)
- Tabela com colunas: Bolsista, Projeto, Status, Enviado em, Acoes
- Linha expansivel (padrao Fragment existente) mostrando historico dos ultimos 12 meses
- No historico expandido: mes/ano, status, link "Baixar PDF", hash SHA-256 (tooltip), versao (v1, v2...), acao "Substituir arquivo"

### 3.2 Funcoes Security Definer para Gestor

- `approve_monthly_report(report_id, feedback?)` - status -> approved, registra approved_at/by, gera final_pdf com carimbo de aprovacao
- `return_monthly_report(report_id, reason)` - status -> returned, registra returned_at/by/reason

### 3.3 PDF Final com Carimbo de Aprovacao

- Ao aprovar, gerar versao "final_pdf" com carimbo textual no rodape: "Aprovado por [Nome] em [Data/Hora]"
- Salvar como entrada separada em `monthly_report_documents` com type='final_pdf'

### 3.4 Novos Componentes

- `src/components/dashboard/MonthlyReportReviewRow.tsx` - linha da tabela para monthly_reports
- `src/components/dashboard/MonthlyReportReviewDialog.tsx` - modal de analise com visualizacao do formulario + acoes aprovar/devolver

---

## FASE 4 - IA Assistiva

### 4.1 Nova Tabela

**monthly_report_ai**
- `id`, `report_id`, `summary_text`, `risks_text`, `inconsistencies_text`, `indicators` (jsonb), `merit_opinion_draft`, `created_at`, `model_version`

### 4.2 Edge Function: `ai-analyze-report`

- Recebe `report_id` e `type` (summary, risks, indicators, opinion)
- Busca payload do formulario + historico dos ultimos 6-12 meses + decisoes anteriores
- Chama API de IA (requer secret de API key - sera solicitada ao usuario)
- Salva resultado em `monthly_report_ai`
- Retorna texto gerado

### 4.3 UI do Gestor - Box "Sugestoes da IA"

- Na tela de analise do relatorio, exibir box com botoes: "Gerar resumo", "Analisar riscos", "Gerar indicadores", "Rascunho de parecer"
- Resultado exibido com marcacao "Gerado por IA" + timestamp
- Botoes "Copiar para parecer" e "Inserir no campo de decisao"
- Aviso: "Requer validacao do gestor"

### 4.4 Pareceres Semestrais e Anuais

- Funcao para consolidar relatorios aprovados de 6 e 12 meses
- Edge function para gerar PDF consolidado com carimbo "Consolidado" + hash
- Botao na tela do gestor quando bolsista atinge 6 ou 12 meses aprovados

---

## FASE 5 - Governanca e Seguranca

### 5.1 Auditoria Completa

- Toda mudanca de status gera `audit_logs` (ja coberto nas fases anteriores)
- Toda geracao de PDF registra `audit_logs` com SHA-256
- Implementar validacao via trigger para impedir mudancas de status invalidas (ex: draft -> approved sem passar por submitted)

### 5.2 Estados de Borda na UI

- Loading: skeleton em todos os componentes de formulario e listagem
- Vazio: mensagem informativa quando nao ha relatorios
- Erro: botao de retry com mensagem descritiva
- Ja seguem o padrao existente no projeto

### 5.3 Performance

- Paginacao de 20 itens nas listagens
- Queries sempre filtradas por `organization_id` e periodo
- Indices no banco: `(beneficiary_user_id, project_id, period_year, period_month)`, `(organization_id, period_year, period_month)`

---

## Detalhes Tecnicos

### Estrutura de Arquivos Novos

```text
src/
  components/
    scholar/
      monthly-report/
        MonthlyReportForm.tsx
        MonthlyReportStatusBadge.tsx
        MonthlyReportActions.tsx
        SubmitReportDialog.tsx
        MonthlyReportViewer.tsx (read-only)
    dashboard/
      MonthlyReportReviewRow.tsx
      MonthlyReportReviewDialog.tsx
      MonthlyReportAIPanel.tsx (Fase 4)
  hooks/
    useMonthlyReport.ts
    useMonthlyReportReview.ts
supabase/
  functions/
    generate-monthly-report-pdf/
      index.ts
    ai-analyze-report/ (Fase 4)
      index.ts
```

### Campos do Formulario (payload jsonb)

```text
{
  "atividades_realizadas": "texto livre",
  "resultados_alcancados": "texto livre",
  "dificuldades_encontradas": "texto livre",
  "proximos_passos": "texto livre",
  "horas_dedicadas": 40,
  "entregas": ["item1", "item2"],
  "observacoes": "texto livre"
}
```

### Coexistencia com Fluxo Antigo

O fluxo antigo (tabela `reports` com upload de PDF) sera mantido. A aba de relatorios do gestor consultara ambas as tabelas. A migracao sera gradual, podendo ser controlada por organizacao ou por projeto tematico.

### Dependencias Externas

- **Fase 1-3**: Nenhuma dependencia externa nova
- **Fase 4 (IA)**: Requer chave de API de provedor de IA (OpenAI, Anthropic, etc.) - sera configurada como secret no Supabase

### Ordem de Implementacao Sugerida

1. Fase 1: Migracao SQL + Hook + Formulario de rascunho
2. Fase 2: Submit + Edge function PDF + Aceite eletronico
3. Fase 3: Painel do gestor adaptado
4. Fase 5: Governanca (pode ser implementada junto com cada fase)
5. Fase 4: IA assistiva (independente, apos Fase 3)
