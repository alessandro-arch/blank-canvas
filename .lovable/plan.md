

# Modulo "Plano de Trabalho do Bolsista"

## Resumo

Adicionar o modulo "Plano de Trabalho" ao BolsaGO como nova aba na tela "Meus Documentos" do bolsista, com upload pelo gestor/admin na area de subprojetos, e integracao com a IA na avaliacao de relatorios mensais.

## Fase 1 -- Banco de Dados (Migracao SQL)

### Tabela `work_plans`

```text
Colunas:
- id (uuid PK)
- organization_id (uuid FK organizations, NOT NULL)
- project_id (uuid FK projects, NOT NULL)  -- subprojeto
- scholar_user_id (uuid NOT NULL)
- uploaded_by (uuid NOT NULL)
- uploaded_at (timestamptz DEFAULT now())
- status (text DEFAULT 'active', CHECK IN ('active','archived'))
- file_name (text NOT NULL)
- file_size (int8 NULL)
- pdf_path (text NOT NULL)
- checksum_sha256 (text NOT NULL)
- extracted_json (jsonb NULL)
- extracted_text (text NULL)
- created_at (timestamptz DEFAULT now())
- updated_at (timestamptz DEFAULT now())

Indices:
- (organization_id, project_id)
- (scholar_user_id)
- Unique parcial: 1 registro active por (project_id, scholar_user_id)
```

### Bucket de Storage

- Criar bucket privado `workplans` (is_public = false)
- Politicas RLS de storage: leitura para bolsista (owner) e gestores/admins da org; escrita apenas gestor/admin

### Politicas RLS na tabela `work_plans`

- SELECT bolsista: `auth.uid() = scholar_user_id`
- SELECT gestor/admin: via `has_role` + `get_user_organizations()`
- INSERT/UPDATE/DELETE: apenas gestor/admin com acesso a org

### Trigger

- `update_updated_at_column` na tabela `work_plans`

## Fase 2 -- Edge Function: `generate-workplan-signed-url`

Nova Edge Function que:
1. Recebe `{ workplan_id }` via POST
2. Valida JWT e verifica role do usuario (bolsista so acessa o proprio; gestor/admin acessa da org)
3. Busca `pdf_path` na tabela `work_plans`
4. Gera signed URL do bucket `workplans` com TTL de 300s
5. Retorna `{ signedUrl }`

Arquivo: `supabase/functions/generate-workplan-signed-url/index.ts`

Configuracao em `supabase/config.toml`:
```text
[functions.generate-workplan-signed-url]
verify_jwt = false
```

## Fase 3 -- Frontend: Aba "Plano de Trabalho" (Portal do Bolsista)

### 3.1 Hook `useWorkPlans`

Novo arquivo: `src/hooks/useWorkPlans.ts`
- Busca `work_plans` filtrado por `scholar_user_id = auth.uid()`
- Retorna lista ordenada por `uploaded_at DESC`
- Funcoes para obter signed URL via edge function

### 3.2 Componente `WorkPlanTab`

Novo arquivo: `src/components/scholar/documents/WorkPlanTab.tsx`
- Segue o mesmo padrao visual do `GrantTermTab`
- Exibe lista de planos (ativos e arquivados)
- Metadados: nome, tamanho, data de envio, status (badge), "Enviado por"
- Botoes "Visualizar" (abre `PdfViewerDialog`) e "Baixar"
- Mensagem informativa: "Este documento esta disponivel para consulta a qualquer momento..."
- Suporte a `searchQuery` (filtro por nome)

### 3.3 Atualizar `ScholarDocuments.tsx`

- Importar `WorkPlanTab`
- Adicionar `TabsTrigger` "Plano de Trabalho" na barra de tabs
- Adicionar `TabsContent` correspondente

## Fase 4 -- Frontend: Upload pelo Gestor/Admin

### 4.1 Componente `UploadWorkPlanDialog`

Novo arquivo: `src/components/scholars/UploadWorkPlanDialog.tsx`
- Segue padrao do `UploadGrantTermDialog`
- Aceita apenas PDF (max 10MB)
- Campos: arquivo PDF + formulario opcional de dados estruturados (objetivo geral, objetivos especificos, atividades, cronograma 1-24 meses)
- Ao salvar:
  - Calcula checksum SHA-256 do arquivo (via Web Crypto API)
  - Faz upload ao bucket `workplans` no path `org/{org_id}/subproject/{project_id}/{uuid}.pdf`
  - Arquiva plano anterior (UPDATE status='archived')
  - Insere novo registro com status='active'
  - Salva dados estruturados em `extracted_json` se preenchidos
- Registra audit log

### 4.2 Integrar na area de subprojetos

- Em `ProjectDetailsDialog.tsx` ou `SubprojectsTable.tsx`, adicionar secao/botao "Plano de Trabalho" com:
  - Indicador se existe plano ativo
  - Botao "Enviar/Substituir Plano de Trabalho" que abre `UploadWorkPlanDialog`
  - Botao "Visualizar" plano ativo (se existir)

## Fase 5 -- Integracao com IA (Avaliacao de Relatorio Mensal)

### 5.1 Atualizar `MonthlyReportAIPanel.tsx`

- Adicionar botao/link "Ver Plano de Trabalho" no header do painel
- Ao clicar, busca work_plan ativo do subprojeto e abre no `PdfViewerDialog`

### 5.2 Atualizar Edge Function `ai-analyze-report`

- Ao montar o contexto para a IA, buscar `work_plans` ativo para o `project_id` do relatorio
- Incluir `extracted_text` e/ou `extracted_json` no prompt
- Enriquecer os prompts de cada tipo de analise:
  - **summary**: mencionar aderencia ao plano
  - **risks**: comparar atividades realizadas vs. cronograma previsto
  - **indicators**: aderencia ao plano (alta/media/baixa), lacunas, itens faltantes
  - **opinion**: incluir recomendacoes baseadas no plano, sugestoes de comprovacao
- Adicionar ao contexto: objetivo geral, objetivos especificos, atividades previstas, e destaque do mes correspondente no cronograma (mes 1-24)

### 5.3 Novo botao "Aderencia ao Plano" (opcional)

- Adicionar 5o tipo de analise `adherence` ao painel de IA
- Prompt especifico que cruza relatorio x plano e retorna: aderencia (alta/media/baixa), lacunas, riscos, sugestoes de evidencias

## Fase 6 -- Atualizar `MonthlyReportsReviewManagement.tsx`

- No modal de avaliacao, adicionar botao "Ver Plano de Trabalho" proximo ao painel de IA
- Busca o work_plan ativo do subprojeto do relatorio em analise
- Abre em nova aba (via signed URL) para consulta simultanea

## Arquivos a Criar

| Arquivo | Descricao |
|---|---|
| `src/hooks/useWorkPlans.ts` | Hook para buscar planos de trabalho |
| `src/components/scholar/documents/WorkPlanTab.tsx` | Aba do bolsista |
| `src/components/scholars/UploadWorkPlanDialog.tsx` | Dialog de upload (gestor) |
| `supabase/functions/generate-workplan-signed-url/index.ts` | Edge Function |

## Arquivos a Editar

| Arquivo | Mudanca |
|---|---|
| `src/pages/ScholarDocuments.tsx` | Adicionar tab "Plano de Trabalho" |
| `src/components/projects/ProjectDetailsDialog.tsx` | Secao "Plano de Trabalho" na aba Acoes |
| `src/components/dashboard/MonthlyReportAIPanel.tsx` | Botao "Ver Plano de Trabalho" |
| `src/components/dashboard/MonthlyReportsReviewManagement.tsx` | Botao "Ver Plano" no modal |
| `supabase/functions/ai-analyze-report/index.ts` | Incluir work_plan no contexto da IA |
| `supabase/config.toml` | Registrar nova edge function |

## Notas Tecnicas

- O checksum SHA-256 sera calculado no navegador via `crypto.subtle.digest('SHA-256', arrayBuffer)` antes do upload
- O bucket `workplans` e privado; todo acesso e via signed URL com TTL curto (300s) gerada pela edge function
- O partial unique index garante que so existe 1 plano ativo por combinacao (project_id, scholar_user_id)
- A extracao de texto do PDF e manual (formulario do gestor); nao sera implementada extracao automatica nesta versao
- O aviso "Gerado por IA -- requer validacao do gestor" permanece em todas as analises

