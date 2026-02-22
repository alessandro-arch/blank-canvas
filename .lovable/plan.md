

# Overhaul da IA de Avaliacao de Relatorio Mensal

## Resumo

Reescrever o sistema de avaliacao por IA para produzir pareceres tecnicos rigorosos em formato JSON estruturado, sem Markdown, usando obrigatoriamente o Plano de Trabalho e o historico de relatorios anteriores. Inclui nova Edge Function, nova tabela de outputs, novo componente de renderizacao e sanitizacao de saida.

## Fase 1 -- Nova Edge Function: `ai-evaluate-monthly-report`

Substituir a logica atual da `ai-analyze-report` por uma nova Edge Function unificada que:

1. Recebe `{ report_id }` (sem `type` -- gera tudo de uma vez)
2. Busca:
   - Relatorio mensal atual (campos + metadados)
   - Perfil do bolsista (nome, instituicao, nivel)
   - Plano de Trabalho ativo (`extracted_text`, `extracted_json`) via `work_plans`
   - Historico dos ultimos 6 relatorios (status, parecer do gestor, resumo de entregas)
   - Metadados do projeto (titulo, codigo, periodo, vigencia)
3. Monta prompt com regras estritas:
   - Idioma: pt-BR obrigatorio
   - Formato: JSON puro (schema definido no prompt)
   - Sem Markdown, sem asteriscos
   - Sem mencao a "horas dedicadas"
   - Regra anti-elogio: penalizar relatos genericos sem evidencias
   - Citar ao menos 2 elementos do Plano e 1 comparacao historica
   - Metricas 0-5: aderencia_plano, evidencia_verificabilidade, progresso_vs_historico, qualidade_tecnica_clareza
   - Decisao sugerida: aprovar / aprovar_com_ressalvas / devolver
4. Chama LLM via Lovable AI Gateway
5. Valida retorno com `JSON.parse` + sanitizacao (remove caracteres CJK, garante schema)
6. Salva em `monthly_report_ai_outputs`
7. Retorna o JSON parseado

### Prompt system (resumo):

```text
Voce e um avaliador tecnico de relatorios mensais de bolsistas de pesquisa.
Regras:
- Responda EXCLUSIVAMENTE em JSON valido, sem Markdown.
- Idioma: pt-BR.
- NAO use asteriscos, hashtags ou formatacao Markdown.
- NAO mencione "horas dedicadas vs esperado".
- Se o relatorio for curto/generico/sem evidencias, reduza fortemente as notas.
- Elogios so com evidencias explicitas (numeros, datasets, resultados).
- Cite ao menos 2 elementos do Plano de Trabalho.
- Compare com historico quando disponivel.
- Schema JSON obrigatorio: { parecer: { ... }, indicadores: { ... }, ... }
```

### Sanitizacao pos-LLM:

- Extrair JSON de dentro de code fences se a LLM envolver em ```json
- `JSON.parse` + fallback
- Regex para remover caracteres CJK: `/[\u4e00-\u9fff\u3400-\u4dbf]/g`
- Remover asteriscos remanescentes
- Validar campos obrigatorios do schema

Arquivo: `supabase/functions/ai-evaluate-monthly-report/index.ts`

## Fase 2 -- Nova Tabela: `monthly_report_ai_outputs`

```text
Colunas:
- id (uuid PK)
- report_id (uuid NOT NULL, FK monthly_reports)
- organization_id (uuid NOT NULL)
- payload (jsonb NOT NULL) -- JSON completo do parecer
- model (text)
- prompt_version (text DEFAULT 'v1')
- generated_by (uuid NULL) -- user que disparou
- created_at (timestamptz DEFAULT now())

Indices:
- (report_id) unique
- (organization_id)

RLS:
- SELECT gestor/admin: org scoped
- INSERT/UPDATE/DELETE: bloqueado via RLS (apenas service_role na Edge Function)
```

Migracao SQL a ser proposta via ferramenta de banco.

## Fase 3 -- Atualizar `MonthlyReportAIPanel.tsx` (reescrita)

Mudancas principais:

1. Substituir os 5 botoes individuais por um unico botao "Gerar Parecer Completo" que chama `ai-evaluate-monthly-report`
2. O resultado e um objeto JSON tipado, nao texto livre
3. Renderizar o JSON em componentes visuais:
   - Card de identificacao (bolsista, projeto, periodo)
   - Secoes de avaliacao tecnica com titulos e texto limpo
   - 4 metricas com barras de progresso (0-5)
   - Listas de evidencias, lacunas, riscos, perguntas
   - Badge de decisao sugerida (aprovar=verde, ressalvas=amarelo, devolver=vermelho)
   - Justificativa da decisao
4. Botoes "Inserir no parecer" (insere justificativa_decisao limpa) e "Copiar parecer" (copia texto formatado sem Markdown)
5. Manter botao "Expandir" para fullscreen
6. Alerta "Gerado por IA -- requer validacao do gestor"
7. Se plano de trabalho nao existir, exibir alerta amarelo antes de gerar

### Tipos TypeScript:

```text
interface AIParecerOutput {
  parecer: {
    titulo: string;
    identificacao: { bolsista: string; instituicao: string; nivel: string; projeto: string; periodo: string };
    sumario: string[];
    avaliacao_tecnica: { secao: string; texto: string }[];
    metricas: {
      aderencia_plano_0a5: number;
      evidencia_verificabilidade_0a5: number;
      progresso_vs_historico_0a5: number;
      qualidade_tecnica_clareza_0a5: number;
    };
    evidencias: string[];
    lacunas: string[];
    riscos_pendencias: string[];
    perguntas_ao_bolsista: string[];
    decisao_sugerida: "aprovar" | "aprovar_com_ressalvas" | "devolver";
    justificativa_decisao: string;
  };
  indicadores: Record<string, unknown>;
  analise_riscos: { riscos: string[]; mitigacoes: string[] };
  resumo_executivo: { texto: string };
}
```

## Fase 4 -- Atualizar `MonthlyReportsReviewManagement.tsx`

- Remover referencia a "horas_dedicadas" no dialog de campos (linha 855)
- O painel de IA ja e renderizado dentro do review dialog (linha 797), apenas garantir que a nova versao funcione

## Fase 5 -- Atualizar `supabase/config.toml`

Adicionar:
```text
[functions.ai-evaluate-monthly-report]
verify_jwt = false
```

## Fase 6 -- Manter Edge Function antiga

A `ai-analyze-report` existente sera mantida para compatibilidade, mas o painel usara a nova `ai-evaluate-monthly-report`.

## Arquivos a Criar

| Arquivo | Descricao |
|---|---|
| `supabase/functions/ai-evaluate-monthly-report/index.ts` | Nova Edge Function unificada |

## Arquivos a Editar

| Arquivo | Mudanca |
|---|---|
| `src/components/dashboard/MonthlyReportAIPanel.tsx` | Reescrita completa para JSON estruturado |
| `src/components/dashboard/MonthlyReportsReviewManagement.tsx` | Remover campo "horas_dedicadas" |
| `supabase/config.toml` | Registrar nova edge function |

## Migracao SQL (a propor)

- Criar tabela `monthly_report_ai_outputs` com RLS

## Notas Tecnicas

- A sanitizacao de caracteres CJK e feita no backend apos receber resposta da LLM, antes de salvar
- O prompt inclui o schema JSON completo como exemplo para a LLM seguir
- O front-end faz `JSON.parse` no retorno e renderiza componentes; se falhar, mostra texto bruto como fallback
- A decisao sugerida e apenas sugestao; os botoes "Aprovar" e "Devolver" continuam sendo acao do gestor
- O campo "horas_dedicadas" e removido tanto do prompt quanto da UI de campos

