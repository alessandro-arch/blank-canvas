

# Corrigir acesso do Auditor a Relatorios e PDFs

## Problema identificado

Tres problemas impedem o auditor de ver dados e exportar PDFs:

1. **Edge functions bloqueiam auditor**: As funcoes `generate-executive-report-pdf`, `generate-scholarship-pdf` e `generate-thematic-project-pdf` verificam o papel do usuario e so permitem `admin` e `manager`. Auditores recebem erro 403 "Acesso restrito a gestores e administradores".

2. **Tabela `pdf_logs` sem politica RLS para auditor**: A pagina "Relatorios" (`PdfReports`) consulta a tabela `pdf_logs`, que so tem politicas SELECT para admin, manager e usuario proprio. Auditor nao consegue ver nenhum registro.

3. **Rota `/auditor/pagamentos` aponta para pagina errada**: O link "Pagamentos" na sidebar do auditor leva a `PaymentsReports`, que e a pagina do **bolsista** (mostra parcelas individuais). O auditor deveria ver a `FinancialManagement` (visao gerencial) ou acessar pagamentos pela aba dentro de Operacao de Bolsas.

## Alteracoes planejadas

### 1. Edge functions (3 arquivos)
Adicionar `"auditor"` na lista de papeis permitidos em cada funcao:

- `supabase/functions/generate-executive-report-pdf/index.ts`
- `supabase/functions/generate-scholarship-pdf/index.ts`
- `supabase/functions/generate-thematic-project-pdf/index.ts`

Alterar de:
```text
if (!userRoles.includes("admin") && !userRoles.includes("manager"))
```
Para:
```text
if (!userRoles.includes("admin") && !userRoles.includes("manager") && !userRoles.includes("auditor"))
```

### 2. Politica RLS na tabela `pdf_logs`
Criar nova politica SELECT para auditor, escopada pela organizacao:

```text
CREATE POLICY "Auditor can view org pdf_logs"
ON public.pdf_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.user_id = auth.uid()
    AND om.role = 'auditor'
    AND om.is_active = true
    AND (
      pdf_logs.organization_id IS NULL
      OR om.organization_id = pdf_logs.organization_id
    )
  )
);
```

### 3. Rota `/auditor/pagamentos` (src/App.tsx)
Trocar o componente de `PaymentsReports` para `FinancialManagement`, que e a visao gerencial de pagamentos (mesma usada por admins/managers).

### 4. Deploy das edge functions
Redeployar as 3 edge functions atualizadas.

## Resumo dos arquivos alterados

| Arquivo | Alteracao |
|---|---|
| `supabase/functions/generate-executive-report-pdf/index.ts` | Adicionar auditor nos papeis permitidos |
| `supabase/functions/generate-scholarship-pdf/index.ts` | Adicionar auditor nos papeis permitidos |
| `supabase/functions/generate-thematic-project-pdf/index.ts` | Adicionar auditor nos papeis permitidos |
| `src/App.tsx` | Trocar PaymentsReports por FinancialManagement na rota do auditor |
| Migracao SQL | Politica RLS para auditor na tabela pdf_logs |

